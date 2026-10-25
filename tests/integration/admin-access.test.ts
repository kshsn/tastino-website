import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { ABSOLUTE_TIMEOUT_MS, IDLE_TIMEOUT_MS } from '@/lib/admin/config';
import { can } from '@/lib/admin/permissions';
import { loadSession } from '@/lib/admin/session';
import { GET as getMe } from '@/app/api/admin/me/route';
import { GET as getUsers, POST as postUsers } from '@/app/api/admin/users/route';
import { PATCH as patchUser } from '@/app/api/admin/users/[id]/route';
import { POST as postUnlock } from '@/app/api/admin/users/[id]/unlock/route';
import { POST as postLogout } from '@/app/api/admin/auth/logout/route';
import { makeUser, minutes, params, request, resetLimiters, signedIn } from './admin-helpers';

afterAll(() => db.$disconnect());
beforeEach(() => resetLimiters());

const asRole = async (role: Role) => {
  const { user } = await makeUser({ role, enrolled: true });
  return { user, ...(await signedIn(user)) };
};

describe('role-based access (US-007.4)', () => {
  it('lets a Super admin open every area', () => {
    expect((['dashboard', 'users', 'audit', 'content', 'leads', 'settings'] as const).every((a) => can('SUPER_ADMIN', a))).toBe(true);
  });

  it('lets a Content editor open content and settings only', () => {
    expect((['dashboard', 'users', 'audit', 'content', 'leads', 'settings'] as const).map((a) => can('CONTENT_EDITOR', a))).toEqual([true, false, false, true, false, true]);
  });

  it('lets Sales open leads only', () => {
    expect((['dashboard', 'users', 'audit', 'content', 'leads', 'settings'] as const).map((a) => can('SALES', a))).toEqual([true, false, false, false, true, false]);
  });

  it('gives no access at all to a missing or unknown role', () => {
    expect([can(null, 'dashboard'), can(undefined, 'dashboard'), can('', 'dashboard'), can('ROOT', 'users'), can('toString', 'users')]).toEqual([false, false, false, false, false]);
  });

  it('answers 401 to an anonymous request, with no data', async () => {
    const res = await getUsers(request('/api/admin/users'));
    expect([res.status, await res.json()]).toEqual([401, { error: 'unauthenticated' }]);
  });

  it('answers 200 to a Super admin and returns no secrets', async () => {
    const { cookie } = await asRole('SUPER_ADMIN');
    const res = await getUsers(request('/api/admin/users', { cookie }));
    const text = await res.text();
    expect([res.status, /passwordHash|totpSecret|recoveryCodeHashes|tokenHash/.test(text)]).toEqual([200, false]);
  });

  it.each(['CONTENT_EDITOR', 'SALES'] as const)('answers 403 to a %s on the users endpoints, even when called directly', async (role) => {
    const { cookie, user } = await asRole(role);
    const list = await getUsers(request('/api/admin/users', { cookie }));
    const create = await postUsers(request('/api/admin/users', { method: 'POST', cookie, body: { name: 'X', email: 'x@example.test', role: 'SALES' } }));
    const patch = await patchUser(request(`/api/admin/users/${user.id}`, { method: 'PATCH', cookie, body: { role: 'SUPER_ADMIN' } }), params(user.id));
    const unlock = await postUnlock(request(`/api/admin/users/${user.id}/unlock`, { method: 'POST', cookie }), params(user.id));
    expect([list.status, create.status, patch.status, unlock.status]).toEqual([403, 403, 403, 403]);
  });

  it('did not create the user a Content editor tried to create', async () => {
    const { cookie } = await asRole('CONTENT_EDITOR');
    await postUsers(request('/api/admin/users', { method: 'POST', cookie, body: { name: 'Sneaky', email: 'sneaky@example.test', role: 'SUPER_ADMIN' } }));
    expect(await db.user.count({ where: { email: 'sneaky@example.test' } })).toBe(0);
  });

  it('lets every role open the "who am I" endpoint, listing only the areas of that role', async () => {
    const out: Record<string, string[]> = {};
    for (const role of ['SUPER_ADMIN', 'CONTENT_EDITOR', 'SALES'] as const) {
      const { cookie } = await asRole(role);
      const res = await getMe(request('/api/admin/me', { cookie }));
      out[role] = (await res.json()).areas;
    }
    expect(out).toEqual({
      SUPER_ADMIN: ['dashboard', 'users', 'audit', 'content', 'leads', 'settings'],
      CONTENT_EDITOR: ['dashboard', 'content', 'settings'],
      SALES: ['dashboard', 'leads'],
    });
  });

  it('applies a role change on the very next request, without signing in again', async () => {
    const { cookie, user } = await asRole('SUPER_ADMIN');
    const before = (await getUsers(request('/api/admin/users', { cookie }))).status;
    await db.user.update({ where: { id: user.id }, data: { role: 'SALES' } });
    const after = (await getUsers(request('/api/admin/users', { cookie }))).status;
    expect([before, after]).toEqual([200, 403]);
  });

  it('writes a denied-access entry for a refused request', async () => {
    const { cookie, user } = await asRole('SALES');
    await getUsers(request('/api/admin/users', { cookie }));
    const entry = await db.auditLog.findFirst({ where: { action: 'access.denied', actorId: user.id } });
    expect([entry?.entityId, entry?.actorId]).toEqual(['users', user.id]);
  });

  it('logs an anonymous attempt as denied with no actor, and never silently drops it', async () => {
    const ip = '203.0.113.77';
    await getUsers(request('/api/admin/users', { ip }));
    const entry = await db.auditLog.findFirst({ where: { action: 'access.denied', ip } });
    expect([entry?.actorId, entry?.entityId]).toEqual([null, 'users']);
  });

  it('refuses a half-finished sign-in as if nobody was signed in', async () => {
    const made = await makeUser({ role: 'SUPER_ADMIN', enrolled: true });
    const { createSession } = await import('@/lib/admin/session');
    const { token } = await createSession(db, made.user.id, 'PENDING_VERIFY', { ip: '127.0.0.1' });
    const res = await getUsers(request('/api/admin/users', { cookie: `tf_admin=${token}` }));
    expect(res.status).toBe(401);
  });

  it('refuses a change that comes from another website', async () => {
    const { cookie } = await asRole('SUPER_ADMIN');
    const res = await postUsers(request('/api/admin/users', { method: 'POST', cookie, headers: { origin: 'https://evil.example' }, body: { name: 'X', email: 'evil@example.test', role: 'SALES' } }));
    expect([res.status, await db.user.count({ where: { email: 'evil@example.test' } })]).toEqual([403, 0]);
  });

  it('refuses a deactivated user whose cookie is still around', async () => {
    const { cookie, user } = await asRole('SUPER_ADMIN');
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    expect((await getUsers(request('/api/admin/users', { cookie }))).status).toBe(401);
  });
});

describe('session timeout and sign out (US-007.5)', () => {
  it('ends a session after 30 minutes of inactivity', async () => {
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const t0 = new Date();
    // Two separate sessions: reading one at minute 29 would (correctly) restart its idle timer.
    const early = await signedIn(user, t0);
    const late = await signedIn(user, t0);
    const stillIn = await loadSession(early.token, minutes(t0, 29));
    const out = await loadSession(late.token, minutes(t0, 31));
    expect([stillIn.ok, out.ok]).toEqual([true, false]);
  });

  it('restarts the idle timer on activity', async () => {
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const t0 = new Date();
    const { token } = await signedIn(user, t0);
    const a = await loadSession(token, minutes(t0, 20));
    const b = await loadSession(token, minutes(t0, 45)); // 25 minutes after the last activity
    const c = await loadSession(token, minutes(t0, 80)); // 35 minutes after
    expect([a.ok, b.ok, c.ok]).toEqual([true, true, false]);
  });

  it('ends a session after 12 hours however active the user is', async () => {
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const t0 = new Date();
    const { token } = await signedIn(user, t0);
    let alive = true;
    for (let m = 20; m < ABSOLUTE_TIMEOUT_MS / 60_000; m += 20) alive = alive && (await loadSession(token, minutes(t0, m))).ok;
    const atEnd = await loadSession(token, new Date(t0.getTime() + ABSOLUTE_TIMEOUT_MS + 60_000));
    expect([alive, atEnd.ok, atEnd.ok ? '' : atEnd.reason]).toEqual([true, false, 'expired']);
    expect(IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  it('reports "expired" (not "none") for a timed-out session, so the page can say why', async () => {
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const t0 = new Date();
    const { token } = await signedIn(user, t0);
    const r = await loadSession(token, minutes(t0, 40));
    expect(r.ok ? '' : r.reason).toBe('expired');
  });

  it('answers an API call with 401 once the session is gone', async () => {
    const { cookie, session } = await asRole('SALES');
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(Date.now() - 31 * 60_000) } });
    expect((await getMe(request('/api/admin/me', { cookie }))).status).toBe(401);
  });

  it('signs out for good: the cookie no longer works, in any tab', async () => {
    const { cookie } = await asRole('SALES');
    const before = (await getMe(request('/api/admin/me', { cookie }))).status;
    const out = await postLogout(request('/api/admin/auth/logout', { method: 'POST', cookie }));
    const after = (await getMe(request('/api/admin/me', { cookie }))).status;
    expect([before, out.status, after]).toEqual([200, 200, 401]);
  });

  it('clears the cookie on sign out', async () => {
    const { cookie } = await asRole('SALES');
    const out = await postLogout(request('/api/admin/auth/logout', { method: 'POST', cookie }));
    expect(out.headers.get('set-cookie')).toMatch(/tf_admin=;|Max-Age=0/);
  });

  it('answers a second sign out without an error and logs only one entry', async () => {
    const { cookie, user } = await asRole('SALES');
    const a = await postLogout(request('/api/admin/auth/logout', { method: 'POST', cookie }));
    const b = await postLogout(request('/api/admin/auth/logout', { method: 'POST', cookie }));
    expect([a.status, b.status, await db.auditLog.count({ where: { action: 'logout', entityId: user.id } })]).toEqual([200, 200, 1]);
  });
});
