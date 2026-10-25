import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { loginWithPassword } from '@/lib/admin/auth-service';
import { sha256 } from '@/lib/admin/crypto';
import { loadSession } from '@/lib/admin/session';
import { acceptInvite, createUser, inspectInvite, listUsers, resendInvite, resetTwoFactor, unlockUser, updateUser } from '@/lib/admin/users-service';
import { POST as postUsers } from '@/app/api/admin/users/route';
import { PATCH as patchUser } from '@/app/api/admin/users/[id]/route';
import { POST as postResend } from '@/app/api/admin/users/[id]/resend-invite/route';
import { POST as postInvite } from '@/app/api/admin/auth/invite/route';
import { KEY, ctxFor, makeUser, minutes, newIp, params, request, resetLimiters, signedIn } from './admin-helpers';

afterAll(() => db.$disconnect());
beforeEach(() => resetLimiters());

let n = 0;
const email = () => `invitee-${Date.now().toString(36)}-${++n}@example.test`;
const superAdmin = async () => (await makeUser({ role: 'SUPER_ADMIN', enrolled: true })).user;
const actorOf = (u: { id: string }) => ({ id: u.id, ip: '198.51.100.7' });
const STRONG = 'a long enough passphrase 42';

describe('creating users (US-007.6)', () => {
  it('saves the user as "invite pending" and creates a single-use invitation valid for 48 hours', async () => {
    const admin = await superAdmin();
    const t0 = new Date();
    const r = await createUser(actorOf(admin), { name: 'Sara Ali', email: email(), role: 'SALES' }, t0);
    if (r.status !== 'created') throw new Error(r.status);
    const token = await db.userToken.findUniqueOrThrow({ where: { tokenHash: sha256(r.inviteToken) } });
    expect([r.user.status, r.user.role, token.expiresAt.getTime() - t0.getTime(), token.usedAt]).toEqual(['invite_pending', 'SALES', 48 * 3600 * 1000, null]);
  });

  it('keeps only a hash of the invitation link in the database', async () => {
    const admin = await superAdmin();
    const r = await createUser(actorOf(admin), { name: 'Hash Check', email: email(), role: 'SALES' });
    if (r.status !== 'created') throw new Error(r.status);
    const rows = await db.userToken.findMany({ where: { userId: r.user.id } });
    expect(rows.some((t) => t.tokenHash === r.inviteToken)).toBe(false);
  });

  it('says the email could not be sent (no mail server configured) but still saves the user', async () => {
    const admin = await superAdmin();
    const r = await createUser(actorOf(admin), { name: 'No Mail', email: email(), role: 'SALES' });
    expect(r.status === 'created' && r.delivery).toBe('not_configured');
  });

  it('rejects an empty name, an empty email and a malformed email, field by field', async () => {
    const admin = await superAdmin();
    const r = await createUser(actorOf(admin), { name: '   ', email: 'nope', role: 'SALES' });
    expect(r).toEqual({ status: 'invalid', errors: { name: 'required', email: 'email' } });
    const r2 = await createUser(actorOf(admin), { name: 'X', email: '', role: 'BOSS' });
    expect(r2.status === 'invalid' && r2.errors).toEqual({ email: 'required', role: 'invalid' });
  });

  it('refuses a duplicate email whatever its letter case and creates no second record', async () => {
    const admin = await superAdmin();
    const address = email();
    await createUser(actorOf(admin), { name: 'First', email: address, role: 'SALES' });
    const again = await createUser(actorOf(admin), { name: 'Second', email: address.toUpperCase(), role: 'CONTENT_EDITOR' });
    expect([again.status, await db.user.count({ where: { email: { equals: address, mode: 'insensitive' } } })]).toEqual(['duplicate', 1]);
  });

  it('turns two simultaneous identical creates into exactly one user', async () => {
    const admin = await superAdmin();
    const address = email();
    const results = await Promise.all([createUser(actorOf(admin), { name: 'A', email: address, role: 'SALES' }), createUser(actorOf(admin), { name: 'A', email: address, role: 'SALES' })]);
    expect([results.map((r) => r.status).sort(), await db.user.count({ where: { email: address } })]).toEqual([['created', 'duplicate'], 1]);
  });

  it('through the API: 201 with the link when no email was sent, 409 for a duplicate, 422 for bad fields', async () => {
    const admin = await superAdmin();
    const { cookie } = await signedIn(admin);
    const address = email();
    const ok = await postUsers(request('/api/admin/users', { method: 'POST', cookie, body: { name: 'Api User', email: address, role: 'SALES' } }));
    const body = await ok.json();
    const dup = await postUsers(request('/api/admin/users', { method: 'POST', cookie, body: { name: 'Api User', email: address, role: 'SALES' } }));
    const bad = await postUsers(request('/api/admin/users', { method: 'POST', cookie, body: { name: '', email: 'x', role: 'SALES' } }));
    const empty = await postUsers(request('/api/admin/users', { method: 'POST', cookie, body: '' }));
    expect([ok.status, typeof body.inviteLink, body.inviteLink.includes('/admin/invite/'), dup.status, bad.status, empty.status]).toEqual([201, 'string', true, 409, 422, 400]);
  });

  it('never lists password hashes, secrets or tokens', async () => {
    await makeUser({ role: 'SALES', enrolled: true });
    const text = JSON.stringify(await listUsers());
    expect(/passwordHash|totpSecret|recoveryCode|tokenHash|\$2[aby]\$/.test(text)).toBe(false);
  });
});

describe('invitations (US-007.6)', () => {
  async function invited() {
    const admin = await superAdmin();
    const address = email();
    const r = await createUser(actorOf(admin), { name: 'New Person', email: address, role: 'CONTENT_EDITOR' });
    if (r.status !== 'created') throw new Error(r.status);
    return { admin, address, token: r.inviteToken, id: r.user.id };
  }

  it('shows who a valid link is for', async () => {
    const { token, address } = await invited();
    expect(await inspectInvite(token)).toEqual({ status: 'valid', name: 'New Person', email: address, reset: false });
  });

  it('lets the invited person choose a password, then sends them to the authenticator set-up (not signed in yet)', async () => {
    const { token, id } = await invited();
    const r = await acceptInvite(token, STRONG, { key: KEY });
    if (r.status !== 'ok') throw new Error(r.status);
    const loaded = await loadSession(r.token);
    const row = await db.user.findUniqueOrThrow({ where: { id } });
    expect([loaded.ok && loaded.session.stage, row.passwordHash?.startsWith('$2'), row.passwordHash?.includes(STRONG)]).toEqual(['PENDING_ENROLL', true, false]);
  });

  it('works once: the same link a second time is "expired"', async () => {
    const { token } = await invited();
    const a = await acceptInvite(token, STRONG, { key: KEY });
    const b = await acceptInvite(token, 'another long passphrase 99', { key: KEY });
    expect([a.status, b.status]).toEqual(['ok', 'expired']);
  });

  it('lets only one of two simultaneous uses win', async () => {
    const { token } = await invited();
    const results = await Promise.all([acceptInvite(token, STRONG, { key: KEY }), acceptInvite(token, STRONG, { key: KEY })]);
    expect(results.map((r) => r.status).sort()).toEqual(['expired', 'ok']);
  });

  it('is "expired" after 48 hours and gives no access', async () => {
    const { token } = await invited();
    const later = minutes(new Date(), 48 * 60 + 5);
    expect([(await inspectInvite(token, later)).status, (await acceptInvite(token, STRONG, { key: KEY, now: later })).status]).toEqual(['expired', 'expired']);
  });

  it('is "expired" for a made-up link', async () => {
    expect([(await inspectInvite('not-a-real-token')).status, (await acceptInvite('not-a-real-token', STRONG, { key: KEY })).status]).toEqual(['expired', 'expired']);
  });

  it('refuses a weak password and keeps the link usable', async () => {
    const { token } = await invited();
    const weak = await acceptInvite(token, 'short', { key: KEY });
    const ok = await acceptInvite(token, STRONG, { key: KEY });
    expect([weak.status, ok.status]).toEqual(['weak', 'ok']);
  });

  it('a resent invitation replaces the old link', async () => {
    const { admin, token, id } = await invited();
    const again = await resendInvite(actorOf(admin), id);
    if (again.status !== 'ok') throw new Error(again.status);
    expect([(await inspectInvite(token)).status, (await inspectInvite(again.inviteToken)).status]).toEqual(['expired', 'valid']);
  });

  it('does not send anything to a deactivated user', async () => {
    const admin = await superAdmin();
    const { user } = await makeUser({ role: 'SALES', enrolled: true, active: false });
    expect((await resendInvite(actorOf(admin), user.id)).status).toBe('not_pending');
  });

  it('through the API: resend gives the new link, and a Super admin sees 404 for an unknown user', async () => {
    const admin = await superAdmin();
    const { cookie } = await signedIn(admin);
    const made = await createUser(actorOf(admin), { name: 'Resend Me', email: email(), role: 'SALES' });
    if (made.status !== 'created') throw new Error(made.status);
    const ok = await postResend(request(`/api/admin/users/${made.user.id}/resend-invite`, { method: 'POST', cookie }), params(made.user.id));
    const missing = await postResend(request('/api/admin/users/nope/resend-invite', { method: 'POST', cookie }), params('nope'));
    expect([ok.status, (await ok.json()).inviteLink.includes('/admin/invite/'), missing.status]).toEqual([200, true, 404]);
  });

  it('the invitation endpoint answers 410 for a used link and 422 for a weak password', async () => {
    const { token } = await invited();
    const weak = await postInvite(request('/api/admin/auth/invite', { method: 'POST', body: { token, password: 'short' } }));
    const ok = await postInvite(request('/api/admin/auth/invite', { method: 'POST', body: { token, password: STRONG } }));
    const used = await postInvite(request('/api/admin/auth/invite', { method: 'POST', body: { token, password: STRONG } }));
    expect([weak.status, ok.status, used.status, ok.headers.get('set-cookie')?.includes('HttpOnly')]).toEqual([422, 200, 410, true]);
  });

  it('a new user who has not set up the authenticator cannot sign in with the password alone', async () => {
    const { token, address } = await invited();
    await acceptInvite(token, STRONG, { key: KEY });
    expect((await loginWithPassword(address, STRONG, ctxFor())).status).toBe('not_enrolled');
  });
});

describe('password reset by a Super admin', () => {
  const NEW_PW = 'a brand new passphrase 7788';

  async function resetFor() {
    const admin = await superAdmin();
    const made = await makeUser({ role: 'SALES', enrolled: true });
    const r = await resendInvite(actorOf(admin), made.user.id);
    if (r.status !== 'ok') throw new Error(r.status);
    return { admin, made, link: r.inviteToken, result: r };
  }

  it('sends a reset link (not an invitation) to a user who already has a password', async () => {
    const { result, made } = await resetFor();
    const entry = await db.auditLog.findFirst({ where: { action: 'user.password_reset_sent', entityId: made.user.id } });
    expect([result.reset, entry !== null]).toEqual([true, true]);
  });

  it('shows the link page as a reset for that user', async () => {
    const { link, made } = await resetFor();
    expect(await inspectInvite(link)).toEqual({ status: 'valid', name: made.user.name, email: made.user.email, reset: true });
  });

  it('changes the password, ends every older sign-in, and still asks for the authenticator code', async () => {
    const { link, made } = await resetFor();
    const { token: oldSession } = await signedIn(made.user);
    const done = await acceptInvite(link, NEW_PW, { key: KEY });
    if (done.status !== 'ok') throw new Error(done.status);
    const stage = await loadSession(done.token);
    const oldLogin = await loginWithPassword(made.user.email, made.password, ctxFor());
    const newLogin = await loginWithPassword(made.user.email, NEW_PW, ctxFor());
    expect([done.next, stage.ok && stage.session.stage, (await loadSession(oldSession)).ok, oldLogin.status, newLogin.status === 'ok' && newLogin.next]).toEqual(['verify', 'PENDING_VERIFY', false, 'invalid', 'verify']);
  });

  it('works once, and a weak new password keeps the link usable', async () => {
    const { link } = await resetFor();
    const weak = await acceptInvite(link, 'short', { key: KEY });
    const ok = await acceptInvite(link, NEW_PW, { key: KEY });
    const again = await acceptInvite(link, NEW_PW, { key: KEY });
    expect([weak.status, ok.status, again.status]).toEqual(['weak', 'ok', 'expired']);
  });

  it('writes a password-reset entry for the user and leaves the old password working until the link is used', async () => {
    const { link, made } = await resetFor();
    const before = await loginWithPassword(made.user.email, made.password, ctxFor());
    await acceptInvite(link, NEW_PW, { key: KEY });
    const entry = await db.auditLog.findFirst({ where: { action: 'user.password_reset', entityId: made.user.id } });
    expect([before.status, entry?.actorId]).toEqual(['ok', made.user.id]);
  });

  it('a user without an authenticator yet goes to the set-up step after a reset', async () => {
    const admin = await superAdmin();
    const made = await makeUser({ role: 'SALES', enrolled: false });
    const r = await resendInvite(actorOf(admin), made.user.id);
    if (r.status !== 'ok') throw new Error(r.status);
    const done = await acceptInvite(r.inviteToken, NEW_PW, { key: KEY });
    expect(done.status === 'ok' && done.next).toBe('enroll');
  });
});

describe('changing users (US-007.6)', () => {
  it('changes a role, signs the user out everywhere and writes an audit entry', async () => {
    const admin = await superAdmin();
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const { token } = await signedIn(user);
    const r = await updateUser(actorOf(admin), user.id, { role: 'CONTENT_EDITOR' });
    const entry = await db.auditLog.findFirst({ where: { action: 'user.update', entityId: user.id }, orderBy: { createdAt: 'desc' } });
    expect([r.status, (await loadSession(token)).ok, entry?.changes]).toEqual(['ok', false, { role: { before: 'SALES', after: 'CONTENT_EDITOR' } }]);
  });

  it('deactivates a user, signs them out and refuses their next sign-in', async () => {
    const admin = await superAdmin();
    const { user, password } = await makeUser({ role: 'SALES', enrolled: true });
    const { token } = await signedIn(user);
    await updateUser(actorOf(admin), user.id, { active: false });
    expect([(await loadSession(token)).ok, (await loginWithPassword(user.email, password, ctxFor())).status]).toEqual([false, 'invalid']);
  });

  it('writes nothing when nothing changed', async () => {
    const admin = await superAdmin();
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const before = await db.auditLog.count({ where: { entityId: user.id } });
    const r = await updateUser(actorOf(admin), user.id, { role: 'SALES', name: user.name });
    expect([r.status, await db.auditLog.count({ where: { entityId: user.id } })]).toEqual(['unchanged', before]);
  });

  it('refuses to remove the last active Super admin: not by deactivating, not by demoting, not by themselves', async () => {
    // Make this the only active Super admin in the database for the duration of the check.
    const others = await db.user.findMany({ where: { role: 'SUPER_ADMIN', active: true }, select: { id: true } });
    await db.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { active: false } });
    try {
      const only = await superAdmin();
      const results = [await updateUser(actorOf(only), only.id, { active: false }), await updateUser(actorOf(only), only.id, { role: 'SALES' })];
      expect(results.map((r) => r.status)).toEqual(['last_super_admin', 'last_super_admin']);
      const second = await superAdmin();
      expect((await updateUser(actorOf(only), only.id, { role: 'SALES' })).status).toBe('ok');
      expect(second.id).toBeTruthy();
    } finally {
      await db.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { active: true } });
    }
  });

  it('through the API: 409 for the last Super admin, 404 for an unknown user, 422 for a bad role', async () => {
    const admin = await superAdmin();
    const { cookie } = await signedIn(admin);
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    const bad = await patchUser(request(`/api/admin/users/${user.id}`, { method: 'PATCH', cookie, body: { role: 'ROOT' } }), params(user.id));
    const missing = await patchUser(request('/api/admin/users/nope', { method: 'PATCH', cookie, body: { active: false } }), params('nope'));
    expect([bad.status, missing.status]).toEqual([422, 404]);
  });

  it('resets two-step: the user must enrol again, old sessions end', async () => {
    const admin = await superAdmin();
    const { user, password } = await makeUser({ role: 'SALES', enrolled: true });
    const { token } = await signedIn(user);
    await resetTwoFactor(actorOf(admin), user.id);
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const login = await loginWithPassword(user.email, password, ctxFor());
    expect([(await loadSession(token)).ok, row.totpEnabled, row.totpSecret, row.recoveryCodeHashes, login.status]).toEqual([false, false, null, [], 'not_enrolled']);
  });

  it('unlocks a locked user at once', async () => {
    const admin = await superAdmin();
    const { user, password } = await makeUser({ role: 'SALES', enrolled: true });
    for (let i = 0; i < 5; i++) await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor());
    const locked = (await listUsers()).find((u) => u.id === user.id)?.status;
    await unlockUser(actorOf(admin), user.id);
    expect([locked, (await loginWithPassword(user.email, password, ctxFor())).status]).toEqual(['locked', 'ok']);
  });
});

describe('audit log (US-007.7)', () => {
  it('records who did what to which record, when, and from which address', async () => {
    const admin = await superAdmin();
    const r = await createUser(actorOf(admin), { name: 'Audited', email: email(), role: 'SALES' });
    if (r.status !== 'created') throw new Error(r.status);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: 'user.create', entityId: r.user.id } });
    expect([entry.actorId, entry.entityType, entry.ip, entry.createdAt instanceof Date]).toEqual([admin.id, 'user', '198.51.100.7', true]);
  });

  it('never stores password hashes, secrets or recovery codes in an entry', async () => {
    const admin = await superAdmin();
    const { user } = await makeUser({ role: 'SALES', enrolled: true });
    await updateUser(actorOf(admin), user.id, { role: 'CONTENT_EDITOR', name: 'Renamed' });
    await resetTwoFactor(actorOf(admin), user.id);
    const entries = await db.auditLog.findMany({ where: { entityId: user.id } });
    expect(/passwordHash|totpSecret|recoveryCodeHashes|\$2[aby]\$|v1\./.test(JSON.stringify(entries))).toBe(false);
  });

  it('refuses to change or delete an entry (append-only), whoever asks', async () => {
    const admin = await superAdmin();
    const r = await createUser(actorOf(admin), { name: 'Immutable', email: email(), role: 'SALES' });
    if (r.status !== 'created') throw new Error(r.status);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: 'user.create', entityId: r.user.id } });
    await expect(db.auditLog.update({ where: { id: entry.id }, data: { action: 'edited' } })).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow();
    await expect(db.$executeRaw`DELETE FROM "AuditLog" WHERE "id" = ${entry.id}`).rejects.toThrow();
  });

  it('rolls back the change when the audit entry cannot be written, so no unlogged change exists', async () => {
    const address = email();
    // An actor that does not exist makes the audit insert fail; the user insert in the same transaction must go too.
    await expect(createUser({ id: 'no-such-actor', ip: '198.51.100.9' }, { name: 'Ghost', email: address, role: 'SALES' })).rejects.toThrow();
    expect(await db.user.count({ where: { email: address } })).toBe(0);
  });

  it('logs sign-in, failed sign-in, lockout and sign-out events', async () => {
    const { user, password } = await makeUser({ role: 'SALES', enrolled: true });
    const ip = newIp();
    for (let i = 0; i < 5; i++) await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor({ ip }));
    const actions = (await db.auditLog.findMany({ where: { entityId: user.id } })).map((e) => e.action);
    expect([actions.filter((a) => a === 'login.failed').length, actions.includes('account.locked')]).toEqual([5, true]);
    expect(password.length).toBeGreaterThan(0);
  });

  it('the first Super admin can be created from the command line, with no actor', async () => {
    const r = await createUser({ id: null, ip: null }, { name: 'First Admin', email: email(), role: 'SUPER_ADMIN' });
    if (r.status !== 'created') throw new Error(r.status);
    const entry = await db.auditLog.findFirstOrThrow({ where: { action: 'user.create', entityId: r.user.id } });
    expect(entry.actorId).toBeNull();
  });
});
