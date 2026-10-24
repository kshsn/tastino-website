import { Prisma } from '@prisma/client';
import { getPublicSettings } from '@/lib/content/public';
import { db } from '@/lib/db';
import { displayPhone } from '@/lib/phone';
import { pick } from '@/lib/text';
import { buildAutoReply, buildNotification, resolveRecipients, type LeadForEmail } from './email-content';
import { getTransport, withRetry, type EmailTransport, type RetryOptions } from './mailer';
import { CONSENT_VERSION, REASON_ENUM, type Reason } from './options';
import { recipientLimiter, requestLimiter, submissionLimiter } from './rate-limit';
import { countryNameEn, validateLead, type LeadField, type ErrorCode } from './validate';

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export type SubmitResult =
  | { status: 'created'; reference: string; leadId: string }
  /** The same submission arrived again (a retry or a double click): the earlier lead is returned, nothing new is stored. */
  | { status: 'duplicate'; reference: string }
  /** The hidden field was filled: answered like a success, nothing stored or sent. */
  | { status: 'spam' }
  | { status: 'invalid'; errors: Partial<Record<LeadField, ErrorCode>> }
  | { status: 'rate_limited'; retryAfterSec: number }
  | { status: 'error' };

export interface SubmitContext {
  /** Address of the visitor (from the reverse proxy), or "unknown". */
  ip: string;
  now?: () => Date;
}

/** `TF-2026-0142`: the year of the request and a number that keeps counting up. */
export function formatReference(year: number, n: number): string {
  return `TF-${year}-${String(n).padStart(4, '0')}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Handles one submission from the public form, in this order: request limit, hidden-field check, validation,
 * duplicate check, submission limit, then saving. The lead is committed before any email is attempted.
 */
export async function submitLead(raw: unknown, ctx: SubmitContext): Promise<SubmitResult> {
  const now = ctx.now ?? (() => new Date());

  const general = requestLimiter.hit(ctx.ip);
  if (!general.allowed) return { status: 'rate_limited', retryAfterSec: general.retryAfterSec };

  if (isRecord(raw) && typeof raw.website === 'string' && raw.website.trim() !== '') return { status: 'spam' };

  const parsed = validateLead(raw);
  if (!parsed.ok) return { status: 'invalid', errors: parsed.errors };
  const input = parsed.data;

  try {
    const byKey = await db.lead.findUnique({ where: { idempotencyKey: input.key }, select: { reference: true } });
    if (byKey) return { status: 'duplicate', reference: byKey.reference };
    const same = await db.lead.findFirst({
      where: { email: input.email, message: input.message, createdAt: { gte: new Date(now().getTime() - DUPLICATE_WINDOW_MS) } },
      select: { reference: true },
      orderBy: { createdAt: 'desc' },
    });
    if (same) return { status: 'duplicate', reference: same.reference };

    const limit = submissionLimiter.hit(ctx.ip);
    if (!limit.allowed) return { status: 'rate_limited', retryAfterSec: limit.retryAfterSec };
    const perEmail = recipientLimiter.hit(input.email);
    if (!perEmail.allowed) return { status: 'rate_limited', retryAfterSec: perEmail.retryAfterSec };

    const when = now();
    const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`SELECT nextval('lead_reference_seq') AS n`;
    const reference = formatReference(when.getUTCFullYear(), Number(n));
    try {
      const lead = await db.lead.create({
        data: {
          reference,
          reason: REASON_ENUM[input.reason],
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
          country: countryNameEn(input.country),
          companyType: input.companyType,
          brandsOfInterest: input.brands,
          product: input.product,
          message: input.message,
          locale: input.locale,
          consent: true,
          consentAt: when,
          consentTextVersion: CONSENT_VERSION,
          idempotencyKey: input.key,
        },
        select: { id: true },
      });
      return { status: 'created', reference, leadId: lead.id };
    } catch (e) {
      // Two identical requests raced: the other one won, so return its lead.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const winner = await db.lead.findUnique({ where: { idempotencyKey: input.key }, select: { reference: true } });
        if (winner) return { status: 'duplicate', reference: winner.reference };
      }
      throw e;
    }
  } catch (e) {
    console.error('Saving a lead failed:', e instanceof Error ? e.message : e);
    return { status: 'error' };
  }
}

export interface DeliverDeps {
  transport?: EmailTransport | null;
  retry?: RetryOptions;
}

export interface DeliverResult {
  notification: 'SENT' | 'FAILED' | 'PENDING';
  autoReply: 'SENT' | 'FAILED' | 'PENDING';
}

/**
 * Sends the internal notification and the visitor's auto-reply for a saved lead. Each is sent at most once
 * (a lead already marked SENT is skipped), failures are retried, and a failure never affects the lead itself.
 * Without SMTP configured nothing is sent and both stay PENDING for a later run (`npm run leads:retry-emails`).
 */
export async function deliverLeadEmails(leadId: string, deps: DeliverDeps = {}): Promise<DeliverResult> {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { notification: 'PENDING', autoReply: 'PENDING' };

  const result: DeliverResult = { notification: lead.emailStatus, autoReply: lead.autoReplyStatus };
  const transport = deps.transport === undefined ? getTransport() : deps.transport;
  if (!transport) {
    console.warn(`Email is not configured: lead ${lead.reference} is saved and its emails are waiting.`);
    return result;
  }

  const [settings, privateRows] = await Promise.all([getPublicSettings(), db.setting.findUnique({ where: { key: 'leads.recipients' } })]);
  const { to, ignored } = resolveRecipients(privateRows?.value);
  if (ignored.length > 0) console.error('Ignoring recipients other than info@tastinofoods.com:', ignored.join(', '));

  const forEmail: LeadForEmail = { ...lead, reason: lead.reason.toLowerCase() as Reason };

  if (lead.emailStatus !== 'SENT') {
    const message = buildNotification(forEmail, to);
    const ok = await withRetry(() => transport.send(message), deps.retry);
    result.notification = ok ? 'SENT' : 'FAILED';
    await db.lead.update({ where: { id: lead.id }, data: { emailStatus: result.notification } });
  }

  if (lead.autoReplyStatus !== 'SENT') {
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
    const message = buildAutoReply(forEmail, {
      responseTime: str(pick(lead.locale, settings['leads.responseTimeEn'], settings['leads.responseTimeAr'])),
      email: str(settings['contact.email']),
      phone: settings['contact.phone'] ? displayPhone(settings['contact.phone']) : '',
      whatsapp: str(settings['contact.whatsapp']) ? `https://wa.me/${str(settings['contact.whatsapp']).replace(/\D/g, '')}` : '',
      address: str(pick(lead.locale, settings['contact.addressEn'], settings['contact.addressAr'])),
    });
    const ok = await withRetry(() => transport.send(message), deps.retry);
    result.autoReply = ok ? 'SENT' : 'FAILED';
    await db.lead.update({ where: { id: lead.id }, data: { autoReplyStatus: result.autoReply } });
  }
  return result;
}

/** Sends whatever is still waiting or failed (leads from the last 14 days). Used by the retry command and cron. */
export async function retryPendingEmails(deps: DeliverDeps = {}): Promise<{ checked: number; sent: number }> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const leads = await db.lead.findMany({
    where: { createdAt: { gte: since }, OR: [{ emailStatus: { not: 'SENT' } }, { autoReplyStatus: { not: 'SENT' } }] },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  let sent = 0;
  for (const l of leads) {
    const r = await deliverLeadEmails(l.id, deps);
    if (r.notification === 'SENT' && r.autoReply === 'SENT') sent++;
  }
  return { checked: leads.length, sent };
}
