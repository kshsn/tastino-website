import { db } from '@/lib/db';
import { AUDIT_PAGE_SIZE, auditWhere, type AuditFilters } from './audit-filters';

export interface AuditRow {
  id: string;
  createdAt: string;
  /** Who did it; null for something nobody was signed in for (a failed sign-in, a refused request, a command). */
  actor: { id: string; name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ip: string | null;
  /** Changed fields (`{ field: { before, after } }`) or small facts about the event. Never secrets. */
  changes: unknown;
}

export interface AuditPage {
  rows: AuditRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

/** One page of the audit log, newest first (50 per page). Read only: nothing here can change an entry. */
export async function listAudit(filters: AuditFilters): Promise<AuditPage> {
  const where = auditWhere(filters);
  const total = await db.auditLog.count({ where });
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const rows = await db.auditLog.findMany({
    where,
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
  });
  return {
    rows: rows.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), actor: r.actor, action: r.action, entityType: r.entityType, entityId: r.entityId, ip: r.ip, changes: r.changes })),
    total,
    page,
    pages,
    pageSize: AUDIT_PAGE_SIZE,
  };
}

/** The choices in the filter boxes: the users who appear in the log, and every action and record type used so far. */
let facetCache: { at: number; value: Awaited<ReturnType<typeof loadFacets>> } | null = null;

/** For tests: forget the cached choices. */
export function resetAuditFacets() {
  facetCache = null;
}

/** Cached for a minute: the choices change slowly and the lookups scan the log. */
export async function auditFacets() {
  if (facetCache && Date.now() - facetCache.at < 60_000) return facetCache.value;
  const value = await loadFacets();
  facetCache = { at: Date.now(), value };
  return value;
}

async function loadFacets(): Promise<{ users: { id: string; name: string }[]; actions: string[]; entityTypes: string[] }> {
  const [users, actions, entityTypes] = await Promise.all([
    db.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    db.auditLog.findMany({ distinct: ['entityType'], select: { entityType: true }, orderBy: { entityType: 'asc' } }),
  ]);
  return { users, actions: actions.map((a) => a.action), entityTypes: entityTypes.map((e) => e.entityType) };
}
