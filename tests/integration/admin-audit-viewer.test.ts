import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { auditQuery, parseAuditFilters } from '@/lib/admin/audit-filters';
import { auditFacets, listAudit, resetAuditFacets } from '@/lib/admin/audit-service';
import { writeAudit } from '@/lib/admin/audit';
import { GET as getAudit } from '@/app/api/admin/audit/route';
import { makeUser, request, resetLimiters, signedIn } from './admin-helpers';

afterAll(() => db.$disconnect());
beforeEach(() => resetLimiters());

let n = 0;
/** An action name no other test uses, so each test sees only its own entries. */
const newAction = () => `test.audit-${Date.now().toString(36)}-${++n}`;
const as = async (role: Role) => {
  const { user } = await makeUser({ role, enrolled: true });
  return { user, ...(await signedIn(user)) };
};
const filters = (extra: Record<string, string>) => parseAuditFilters(extra).filters;

describe('audit log viewer (US-007.8)', () => {
  it('lists entries newest first, 50 per page', async () => {
    const action = newAction();
    const base = Date.now();
    await db.auditLog.createMany({ data: Array.from({ length: 60 }, (_, i) => ({ action, entityType: 'test', entityId: `e${i}`, createdAt: new Date(base - i * 1000) })) });
    const first = await listAudit(filters({ action }));
    const second = await listAudit(filters({ action, page: '2' }));
    expect([first.rows.length, second.rows.length, first.total, first.pages, first.rows[0].entityId, second.rows.at(-1)?.entityId]).toEqual([50, 10, 60, 2, 'e0', 'e59']);
  });

  it('filters by user, action, record type and date range, and the count matches', async () => {
    const { user } = await as('SUPER_ADMIN');
    const action = newAction();
    const t = Date.UTC(2026, 3, 10, 12);
    await writeAudit(db, { actorId: user.id, action, entityType: 'brand', entityId: 'b1' });
    await db.auditLog.createMany({
      data: [
        { action, entityType: 'product', entityId: 'p1', createdAt: new Date(t) },
        { action, entityType: 'product', entityId: 'p2', createdAt: new Date(t + 5 * 86_400_000) },
      ],
    });
    const ids = async (extra: Record<string, string>) => (await listAudit(filters({ action, ...extra }))).rows.map((r) => r.entityId).sort();
    expect(await ids({ user: user.id })).toEqual(['b1']);
    expect(await ids({ user: 'none' })).toEqual(['p1', 'p2']);
    expect(await ids({ entity: 'product' })).toEqual(['p1', 'p2']);
    expect(await ids({ from: '2026-04-12', to: '2026-04-20' })).toEqual(['p2']);
    expect(await ids({ from: '2026-04-10', to: '2026-04-10' })).toEqual(['p1']);
    expect((await listAudit(filters({ action, entity: 'product' }))).total).toBe(2);
  });

  it('shows an empty list (not an error) when nothing matches', async () => {
    const page = await listAudit(filters({ action: newAction() }));
    expect([page.rows, page.total, page.pages]).toEqual([[], 0, 1]);
  });

  it('reports a bad date and an end before the start, and ignores them', () => {
    expect(parseAuditFilters({ from: '10/04/2026' }).errors).toEqual(['date']);
    const r = parseAuditFilters({ from: '2026-05-02', to: '2026-05-01' });
    expect([r.errors, r.filters.from, r.filters.to]).toEqual([['range'], undefined, undefined]);
  });

  it('keeps the same filters in the page links', () => {
    expect(auditQuery(parseAuditFilters({ user: 'abc', action: 'login.failed', entity: 'user', from: '2026-01-01', page: '3' }).filters)).toBe('user=abc&action=login.failed&entity=user&from=2026-01-01');
  });

  it('carries before and after values of a change, ready to show side by side', async () => {
    const { user } = await as('SUPER_ADMIN');
    const action = newAction();
    await writeAudit(db, { actorId: user.id, action, entityType: 'user', entityId: 'x', ip: '203.0.113.5', changes: { role: { before: 'SALES', after: 'CONTENT_EDITOR' } } });
    const [row] = (await listAudit(filters({ action }))).rows;
    expect([row.actor?.name, row.ip, row.changes]).toEqual([user.name, '203.0.113.5', { role: { before: 'SALES', after: 'CONTENT_EDITOR' } }]);
  });

  it('returns attacker-chosen text as plain data (the screen escapes it)', async () => {
    const action = newAction();
    await writeAudit(db, { action, entityType: 'user', changes: { email: '<img src=x onerror=alert(1)>', reason: 'unknown account' } });
    const [row] = (await listAudit(filters({ action }))).rows;
    expect((row.changes as { email: string }).email).toBe('<img src=x onerror=alert(1)>');
  });

  it('offers the users, actions and record types that appear in the log', async () => {
    const { user } = await as('SUPER_ADMIN');
    const action = newAction();
    await writeAudit(db, { actorId: user.id, action, entityType: 'facet-test' });
    resetAuditFacets();
    const facets = await auditFacets();
    expect([facets.users.some((u) => u.id === user.id), facets.actions.includes(action), facets.entityTypes.includes('facet-test')]).toEqual([true, true, true]);
  });

  it('refuses to change or delete an entry whoever asks (append-only in the database)', async () => {
    const action = newAction();
    await db.auditLog.create({ data: { action, entityType: 'x' } });
    const entry = await db.auditLog.findFirstOrThrow({ where: { action } });
    await expect(db.auditLog.update({ where: { id: entry.id }, data: { action: 'edited' } })).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow();
  });
});

describe('who may open the audit log (US-007.8)', () => {
  it('lets a Super admin in, answers 403 to a Content editor and to Sales, and 401 to anyone not signed in', async () => {
    const codes: number[] = [];
    for (const role of ['SUPER_ADMIN', 'CONTENT_EDITOR', 'SALES'] as const) {
      const { cookie } = await as(role);
      codes.push((await getAudit(request('/api/admin/audit', { cookie }))).status);
    }
    codes.push((await getAudit(request('/api/admin/audit'))).status);
    expect(codes).toEqual([200, 403, 403, 401]);
  });

  it('returns no entries in a refusal', async () => {
    const action = newAction();
    await db.auditLog.create({ data: { action, entityType: 'secret-area' } });
    const { cookie } = await as('CONTENT_EDITOR');
    const text = await (await getAudit(request(`/api/admin/audit?action=${action}`, { cookie }))).text();
    expect(text.includes(action)).toBe(false);
  });

  it('answers 422 for an invalid date through the API and returns the page with its filter choices otherwise', async () => {
    const { cookie } = await as('SUPER_ADMIN');
    const bad = await getAudit(request('/api/admin/audit?from=2026-02-30', { cookie }));
    const ok = await getAudit(request('/api/admin/audit?page=1', { cookie }));
    const body = await ok.json();
    expect([bad.status, ok.status, Array.isArray(body.rows), Array.isArray(body.facets.actions), body.pageSize]).toEqual([422, 200, true, true, 50]);
  });
});
