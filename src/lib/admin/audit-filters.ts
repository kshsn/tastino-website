import type { Prisma } from '@prisma/client';

export const AUDIT_PAGE_SIZE = 50;

export interface AuditFilters {
  /** A user id, or 'none' for entries with no signed-in user (failed sign-ins, refused requests). */
  actorId?: string;
  action?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  page: number;
}

export type AuditFilterError = 'date' | 'range';

type Raw = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

const parseDay = (v: string | undefined): Date | undefined | 'bad' => {
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'bad';
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? 'bad' : d;
};

/** Filters from a query string. A bad date or an end before the start is reported (and ignored), never a crash. */
export function parseAuditFilters(raw: Raw): { filters: AuditFilters; errors: AuditFilterError[] } {
  const errors: AuditFilterError[] = [];
  const filters: AuditFilters = { page: 1 };

  const actor = one(raw.user);
  if (actor && actor.length <= 40) filters.actorId = actor;
  const action = one(raw.action);
  if (action && action.length <= 80) filters.action = action;
  const entity = one(raw.entity);
  if (entity && entity.length <= 40) filters.entityType = entity;

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

  const page = Number.parseInt(one(raw.page) ?? '1', 10);
  filters.page = Number.isFinite(page) && page >= 1 && page <= 1_000_000 ? page : 1;
  return { filters, errors };
}

export function auditWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.actorId) and.push(f.actorId === 'none' ? { actorId: null } : { actorId: f.actorId });
  if (f.action) and.push({ action: f.action });
  if (f.entityType) and.push({ entityType: f.entityType });
  if (f.from) and.push({ createdAt: { gte: f.from } });
  if (f.to) and.push({ createdAt: { lt: new Date(f.to.getTime() + 24 * 3600 * 1000) } });
  return and.length ? { AND: and } : {};
}

export function auditQuery(f: AuditFilters): string {
  const p = new URLSearchParams();
  if (f.actorId) p.set('user', f.actorId);
  if (f.action) p.set('action', f.action);
  if (f.entityType) p.set('entity', f.entityType);
  if (f.from) p.set('from', f.from.toISOString().slice(0, 10));
  if (f.to) p.set('to', f.to.toISOString().slice(0, 10));
  return p.toString();
}
