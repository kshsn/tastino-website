import { LeadReason, LeadStatus, type Prisma } from '@prisma/client';

export const PAGE_SIZE = 25;
export const RETENTION_MONTHS = 24;

export type ArchivedView = 'no' | 'only' | 'all';

export interface LeadFilters {
  status?: LeadStatus;
  reason?: LeadReason;
  country?: string;
  /** A user id, or 'none' for "not assigned". */
  assigneeId?: string;
  archived: ArchivedView;
  /** Inclusive day range (UTC). */
  from?: Date;
  to?: Date;
  q?: string;
  /** Only leads received more than 24 months ago. */
  pastRetention?: boolean;
  page: number;
}

export type FilterError = 'range' | 'date' | 'status' | 'reason';

type Raw = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

const parseDay = (v: string | undefined): Date | undefined | 'bad' => {
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'bad';
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? 'bad' : d;
};

/**
 * Filters from a query string or a search-params object. Unknown values are ignored (never an error page);
 * a wrong status or reason, a bad date or an end before the start is reported so the screen can say so.
 */
export function parseLeadFilters(raw: Raw): { filters: LeadFilters; errors: FilterError[] } {
  const errors: FilterError[] = [];
  const filters: LeadFilters = { archived: 'no', page: 1 };

  const status = one(raw.status);
  if (status) {
    if ((Object.values(LeadStatus) as string[]).includes(status)) filters.status = status as LeadStatus;
    else errors.push('status');
  }
  const reason = one(raw.reason);
  if (reason) {
    if ((Object.values(LeadReason) as string[]).includes(reason)) filters.reason = reason as LeadReason;
    else errors.push('reason');
  }

  const country = one(raw.country);
  if (country && country.length <= 80) filters.country = country;
  const assignee = one(raw.assignee);
  if (assignee && assignee.length <= 40) filters.assigneeId = assignee;
  const archived = one(raw.archived);
  if (archived === 'only' || archived === 'all') filters.archived = archived;

  const from = parseDay(one(raw.from));
  const to = parseDay(one(raw.to));
  if (from === 'bad' || to === 'bad') errors.push('date');
  else {
    if (from) filters.from = from;
    if (to) filters.to = to;
    if (from && to && to < from) {
      errors.push('range');
      delete filters.from;
      delete filters.to;
    }
  }

  const q = one(raw.q);
  if (q) filters.q = q.slice(0, 100);
  if (one(raw.retention) === '1') filters.pastRetention = true;

  const page = Number.parseInt(one(raw.page) ?? '1', 10);
  filters.page = Number.isFinite(page) && page >= 1 && page <= 100_000 ? page : 1;
  return { filters, errors };
}

/** The filters as a query string (without the page), so links, exports and the audit entry all agree. */
export function filtersToQuery(f: LeadFilters, withPage = false, redactSearch = false): string {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.reason) p.set('reason', f.reason);
  if (f.country) p.set('country', f.country);
  if (f.assigneeId) p.set('assignee', f.assigneeId);
  if (f.archived !== 'no') p.set('archived', f.archived);
  if (f.from) p.set('from', f.from.toISOString().slice(0, 10));
  if (f.to) p.set('to', f.to.toISOString().slice(0, 10));
  // The audit log is append-only: an email address typed into the search box must not end up in it for good.
  if (f.q) p.set(redactSearch ? 'qUsed' : 'q', redactSearch ? '1' : f.q);
  if (f.pastRetention) p.set('retention', '1');
  if (withPage && f.page > 1) p.set('page', String(f.page));
  return p.toString();
}

/** `n` calendar months before `date` (not 30 days each): 29 February minus two years is 28 February. */
export function subtractMonths(date: Date, n: number): Date {
  const out = new Date(date.getTime());
  const day = out.getUTCDate();
  out.setUTCDate(1);
  out.setUTCMonth(out.getUTCMonth() - n);
  const last = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(day, last));
  return out;
}

/** A lead received before this moment is past the 24-month retention period. */
export const retentionCutoff = (now: Date = new Date()): Date => subtractMonths(now, RETENTION_MONTHS);

export function leadWhere(f: LeadFilters, now: Date = new Date()): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  if (f.archived === 'no') and.push({ archived: false });
  if (f.archived === 'only') and.push({ archived: true });
  if (f.status) and.push({ status: f.status });
  if (f.reason) and.push({ reason: f.reason });
  if (f.country) and.push({ country: f.country });
  if (f.assigneeId) and.push(f.assigneeId === 'none' ? { assigneeId: null } : { assigneeId: f.assigneeId });
  if (f.from) and.push({ createdAt: { gte: f.from } });
  if (f.to) and.push({ createdAt: { lt: new Date(f.to.getTime() + 24 * 3600 * 1000) } });
  if (f.pastRetention) and.push({ createdAt: { lt: retentionCutoff(now) } });
  if (f.q) {
    // Prisma does not escape LIKE wildcards: without this a search for "%" or "_" would match every lead.
    const contains = { contains: f.q.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' as const };
    and.push({ OR: [{ name: contains }, { email: contains }, { company: contains }, { reference: contains }] });
  }
  return and.length ? { AND: and } : {};
}
