import { LeadStatus, type Lead, type LeadNote, type Prisma, type User } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { diffFields, writeAudit } from './audit';
import { SlidingWindowLimiter } from '@/lib/leads/rate-limit';
import { PAGE_SIZE, filtersToQuery, leadWhere, retentionCutoff, type LeadFilters } from './leads-filters';
import type { Actor } from './users-service';

export { LEAD_STATUSES, STATUS_LABEL } from './leads-labels';

export interface AssigneeRef {
  id: string;
  name: string;
  active: boolean;
}

export interface LeadRow {
  id: string;
  reference: string;
  name: string;
  company: string;
  country: string;
  reason: Lead['reason'];
  status: LeadStatus;
  assignee: AssigneeRef | null;
  notesCount: number;
  archived: boolean;
  /** Received more than 24 months ago (US-009.6). Nothing is deleted automatically. */
  retention: boolean;
  createdAt: string;
}

export interface NoteView {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}

export interface LeadDetail extends LeadRow {
  email: string;
  phone: string | null;
  city: string | null;
  companyType: string | null;
  brandsOfInterest: string[];
  product: string | null;
  message: string;
  locale: string;
  consentAt: string;
  consentTextVersion: string;
  emailStatus: Lead['emailStatus'];
  autoReplyStatus: Lead['autoReplyStatus'];
  notes: NoteView[];
}

const withAssignee = { assignee: { select: { id: true, name: true, active: true } }, _count: { select: { notes: true } } } satisfies Prisma.LeadInclude;
type LeadWithRefs = Prisma.LeadGetPayload<{ include: typeof withAssignee }>;

function toRow(l: LeadWithRefs, cutoff: Date): LeadRow {
  return {
    id: l.id,
    reference: l.reference,
    name: l.name,
    company: l.company,
    country: l.country,
    reason: l.reason,
    status: l.status,
    assignee: l.assignee ? { id: l.assignee.id, name: l.assignee.name, active: l.assignee.active } : null,
    notesCount: l._count.notes,
    archived: l.archived,
    retention: !l.createdAt || l.createdAt < cutoff, // a missing date is flagged for review rather than ignored
    createdAt: l.createdAt?.toISOString() ?? '',
  };
}

export interface LeadPage {
  rows: LeadRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

/** One page of leads, newest first. */
export async function listLeads(filters: LeadFilters, now: Date = new Date()): Promise<LeadPage> {
  const where = leadWhere(filters, now);
  const total = await db.lead.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const cutoff = retentionCutoff(now);
  const rows = await db.lead.findMany({ where, include: withAssignee, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  return { rows: rows.map((r) => toRow(r, cutoff)), total, page, pages, pageSize: PAGE_SIZE };
}

export async function getLead(id: string, now: Date = new Date()): Promise<LeadDetail | null> {
  const lead = await db.lead.findUnique({ where: { id }, include: { ...withAssignee, notes: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { author: { select: { name: true } } } } } });
  if (!lead) return null;
  const notes = lead.notes as (LeadNote & { author: Pick<User, 'name'> | null })[];
  return {
    ...toRow(lead, retentionCutoff(now)),
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    companyType: lead.companyType,
    brandsOfInterest: lead.brandsOfInterest,
    product: lead.product,
    message: lead.message,
    locale: lead.locale,
    consentAt: lead.consentAt.toISOString(),
    consentTextVersion: lead.consentTextVersion,
    emailStatus: lead.emailStatus,
    autoReplyStatus: lead.autoReplyStatus,
    notes: notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), author: n.author?.name ?? 'Former user' })),
  };
}

/** People a lead can be given to: active Sales and Super admin users. */
export async function listAssignees(): Promise<AssigneeRef[]> {
  const users = await db.user.findMany({ where: { active: true, role: { in: ['SALES', 'SUPER_ADMIN'] } }, select: { id: true, name: true, active: true }, orderBy: { name: 'asc' } });
  return users;
}

// ───────── changing a lead ─────────

const updateSchema = z
  .object({
    status: z.enum(['NEW', 'IN_CONTACT', 'QUALIFIED', 'CLOSED'], { error: 'invalid' }),
    /** The status the user was looking at; if the lead has moved on, the change is refused with the current one. */
    expectedStatus: z.enum(['NEW', 'IN_CONTACT', 'QUALIFIED', 'CLOSED'], { error: 'invalid' }),
    assigneeId: z.string({ error: 'invalid' }).min(1, 'invalid').max(40, 'invalid').nullable(),
    archived: z.boolean({ error: 'invalid' }),
  })
  .partial();

export type LeadErrors = Partial<Record<'status' | 'expectedStatus' | 'assigneeId' | 'archived', 'invalid'>>;

export type UpdateLeadResult =
  | { status: 'ok'; lead: LeadDetail }
  | { status: 'unchanged'; lead: LeadDetail }
  | { status: 'conflict'; lead: LeadDetail }
  | { status: 'invalid'; errors: LeadErrors }
  | { status: 'not_found' };

/**
 * Status, assignee and archive state. Each real change writes its own audit entry (old and new value); selecting the
 * same value again changes and logs nothing. If the lead was changed by someone else since the user loaded it, the
 * change is refused and the latest state is returned, so nobody silently overwrites a colleague.
 */
export async function updateLead(actor: Actor, id: string, raw: unknown, now: Date = new Date()): Promise<UpdateLeadResult> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: LeadErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof LeadErrors | undefined;
      if (field) errors[field] = 'invalid';
    }
    return { status: 'invalid', errors };
  }
  const patch = parsed.data;

  const outcome = await db.$transaction(async (tx): Promise<'not_found' | 'conflict' | 'unchanged' | { assigneeInvalid: true } | 'done'> => {
    const lead = await tx.lead.findUnique({ where: { id } });
    if (!lead) return 'not_found';
    if (patch.expectedStatus && patch.expectedStatus !== lead.status) return 'conflict';

    if (patch.assigneeId) {
      const target = await tx.user.findUnique({ where: { id: patch.assigneeId } });
      if (!target || !target.active || (target.role !== 'SALES' && target.role !== 'SUPER_ADMIN')) return { assigneeInvalid: true };
    }

    const next = {
      status: patch.status ?? lead.status,
      assigneeId: patch.assigneeId === undefined ? lead.assigneeId : patch.assigneeId,
      archived: patch.archived ?? lead.archived,
    };
    const changes = diffFields({ status: lead.status, assigneeId: lead.assigneeId, archived: lead.archived }, next);
    if (Object.keys(changes).length === 0) return 'unchanged';

    // The change only applies if the lead is still as it was read: a parallel change makes this match nothing.
    const done = await tx.lead.updateMany({
      where: { id, status: lead.status, assigneeId: lead.assigneeId, archived: lead.archived },
      data: { ...next, archivedAt: next.archived ? (lead.archived ? lead.archivedAt : now) : null },
    });
    if (done.count !== 1) return 'conflict';

    const entry = (action: string, key: keyof typeof changes) => writeAudit(tx, { actorId: actor.id, action, entityType: 'lead', entityId: id, ip: actor.ip, changes: { [key]: changes[key] } });
    if (changes.status) await entry('lead.status_change', 'status');
    if (changes.assigneeId) await entry('lead.assign', 'assigneeId');
    if (changes.archived) await entry(next.archived ? 'lead.archive' : 'lead.restore', 'archived');
    return 'done';
  });

  if (typeof outcome === 'object') return { status: 'invalid', errors: { assigneeId: 'invalid' } };
  if (outcome === 'not_found') return { status: 'not_found' };
  const lead = (await getLead(id, now))!;
  return { status: outcome === 'done' ? 'ok' : outcome, lead } as UpdateLeadResult;
}

// ───────── notes ─────────

const noteSchema = z.object({ body: z.string({ error: 'required' }).trim().min(1, 'required').max(2000, 'tooLong') });

export type AddNoteResult = { status: 'ok'; note: NoteView; duplicate: boolean } | { status: 'invalid'; error: 'required' | 'tooLong' } | { status: 'not_found' };

const DOUBLE_SUBMIT_MS = 30_000;

/**
 * Adds an internal note (shown as plain text, never as HTML). Notes cannot be edited or deleted: there is no endpoint
 * for it, and the database refuses it too. The same text from the same person within 30 seconds is the same note, so a
 * double click or a retry after a lost answer adds exactly one.
 */
export async function addNote(actor: Actor & { name: string }, leadId: string, raw: unknown, now: Date = new Date()): Promise<AddNoteResult> {
  const parsed = noteSchema.safeParse(raw);
  if (!parsed.success) return { status: 'invalid', error: parsed.error.issues[0]?.message === 'tooLong' ? 'tooLong' : 'required' };
  const { body } = parsed.data;

  return db.$transaction(async (tx): Promise<AddNoteResult> => {
    // One at a time per lead and author, so two identical requests at the very same moment still make one note.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`note:${leadId}:${actor.id ?? ''}`}))`;
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) return { status: 'not_found' };
    const recent = await tx.leadNote.findFirst({ where: { leadId, authorId: actor.id, body, createdAt: { gte: new Date(now.getTime() - DOUBLE_SUBMIT_MS) } }, orderBy: { createdAt: 'desc' } });
    if (recent) return { status: 'ok', duplicate: true, note: { id: recent.id, body: recent.body, createdAt: recent.createdAt.toISOString(), author: actor.name } };
    const note = await tx.leadNote.create({ data: { leadId, authorId: actor.id, body, createdAt: now } });
    await writeAudit(tx, { actorId: actor.id, action: 'lead.note', entityType: 'lead', entityId: leadId, ip: actor.ip, changes: { noteId: note.id } });
    return { status: 'ok', duplicate: false, note: { id: note.id, body: note.body, createdAt: note.createdAt.toISOString(), author: actor.name } };
  });
}

// ───────── retention (US-009.6) ─────────

export async function retentionSummary(now: Date = new Date()): Promise<{ count: number; oldest: string | null; cutoff: string }> {
  const cutoff = retentionCutoff(now);
  const where = { createdAt: { lt: cutoff } } satisfies Prisma.LeadWhereInput;
  const [count, oldest] = await Promise.all([db.lead.count({ where }), db.lead.findFirst({ where, orderBy: { createdAt: 'asc' }, select: { createdAt: true } })]);
  return { count, oldest: oldest?.createdAt.toISOString() ?? null, cutoff: cutoff.toISOString() };
}

// ───────── CSV export (US-009.5) ─────────

export const CSV_COLUMNS = ['id', 'reference', 'received (UTC)', 'name', 'email', 'phone', 'company', 'country', 'reason', 'status', 'assignee', 'notes', 'archived', 'company type', 'brands', 'product', 'language', 'message', 'past 24 months'] as const;

/**
 * One CSV cell. A value that starts with = + - or @ (or a tab or return) would be run as a formula by a spreadsheet,
 * so it gets a leading apostrophe; quotes, commas and line breaks are wrapped in quotes with inner quotes doubled.
 */
export function csvCell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Spreadsheets and importers may trim spaces, control characters and quotes before reading a formula, so the check
  // looks past them: ` =1+1`, `"=cmd`, a leading line break and similar all get the apostrophe.
  if (/^[\t\r\n]/.test(text) || /^[\s\u0000-\u001f\u00a0'"]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A phone number such as +201001234567 is exported as it is (digits cannot form a formula); anything else is a normal cell. */
export const phoneCell = (value: string | null | undefined): string => (value && /^\+\d[\d ]{6,20}$/.test(value) ? value : csvCell(value));

export const csvRow = (cells: (string | number | boolean | null | undefined)[]): string => cells.map(csvCell).join(',') + '\r\n';

/** Same as csvRow, but the cells at `raw` positions are already rendered (see phoneCell). */
const rowWithRaw = (cells: (string | number | boolean | null | undefined)[], raw: number[]): string => cells.map((c, i) => (raw.includes(i) ? String(c ?? '') : csvCell(c))).join(',') + '\r\n';

const BATCH = 500;

/**
 * The filtered leads as a CSV stream: UTF-8 with a byte order mark (so Arabic opens correctly in Excel), read in
 * batches so thousands of rows never sit in memory at once. The audit entry (who, which filters, how many rows) is
 * written only when the last byte has been produced.
 */
export const exportLimiter = new SlidingWindowLimiter(5, 10 * 60 * 1000);
const activeExports = new Set<string>();

/** At most 5 exports per person per 10 minutes and one running at a time (each one scans the database in batches). */
export function acquireExport(userId: string): { ok: true; release: () => void } | { ok: false; retryAfterSec: number } {
  if (activeExports.has(userId)) return { ok: false, retryAfterSec: 10 };
  const hit = exportLimiter.hit(userId);
  if (!hit.allowed) return { ok: false, retryAfterSec: hit.retryAfterSec };
  activeExports.add(userId);
  return { ok: true, release: () => void activeExports.delete(userId) };
}

export function exportLeadsCsv(filters: LeadFilters, actor: Actor, now: Date = new Date(), onEnd?: () => void): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const where = leadWhere(filters, now);
  const cutoff = retentionCutoff(now);
  let cursor: string | undefined;
  let rows = 0;
  let started = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) {
          started = true;
          // The export is logged BEFORE the first byte leaves, so cancelling or dropping the connection cannot hide it.
          await writeAudit(db, { actorId: actor.id, action: 'lead.export', entityType: 'lead', ip: actor.ip, changes: { filters: filtersToQuery(filters, false, true) } });
          controller.enqueue(encoder.encode('\uFEFF' + csvRow([...CSV_COLUMNS])));
        }
        const batch = await db.lead.findMany({
          where,
          include: withAssignee,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (batch.length === 0) {
          await writeAudit(db, { actorId: actor.id, action: 'lead.export_complete', entityType: 'lead', ip: actor.ip, changes: { filters: filtersToQuery(filters, false, true), rows } });
          controller.close();
          onEnd?.();
          return;
        }
        let chunk = '';
        for (const l of batch) {
          const row = toRow(l, cutoff);
          chunk += rowWithRaw([l.id, l.reference, l.createdAt.toISOString(), l.name, l.email, phoneCell(l.phone), l.company, l.country, l.reason, l.status, row.assignee?.name ?? '', row.notesCount, l.archived, l.companyType, l.brandsOfInterest.join('; '), l.product, l.locale, l.message, row.retention], [5]);
        }
        rows += batch.length;
        cursor = batch[batch.length - 1].id;
        controller.enqueue(encoder.encode(chunk));
      } catch (e) {
        controller.error(e);
        onEnd?.();
      }
    },
    cancel() {
      onEnd?.();
    },
  });
}

