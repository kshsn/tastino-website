import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { beginEnrollment, confirmEnrollment, loginWithPassword, signOut, verifySecondFactor } from '@/lib/admin/auth-service';
import { decryptSecret } from '@/lib/admin/crypto';
import { createSession, loadSession } from '@/lib/admin/session';
import { currentTotp } from '@/lib/admin/totp';
import { unlockUser } from '@/lib/admin/users-service';
import { KEY, ctxFor, makeUser, minutes, newIp, resetLimiters } from './admin-helpers';

afterAll(() => db.$disconnect());
beforeEach(() => resetLimiters());

const auditCount = (where: Record<string, unknown>) => db.auditLog.count({ where });

describe('sign in with email and password (US-007.1)', () => {
  it('accepts a valid password and goes on to the code step, without opening the admin yet', async () => {
    const { user, password } = await makeUser({ enrolled: true });
    const r = await loginWithPassword(user.email, password, ctxFor());
    expect(r.status === 'ok' && r.next).toBe('verify');
    if (r.status !== 'ok') return;
    const loaded = await loadSession(r.token);
    expect(loaded.ok && loaded.session.stage).toBe('PENDING_VERIFY');
  });

  it('does not open the authenticator set-up to a password alone (only the invitation or reset link does)', async () => {
    const { user, password } = await makeUser({ enrolled: false });
    const r = await loginWithPassword(user.email, password, ctxFor());
    expect([r.status, await db.session.count({ where: { userId: user.id } })]).toEqual(['not_enrolled', 0]);
  });

  it('gives the same plain answer for a wrong password, an unknown email and a deactivated user', async () => {
    const good = await makeUser({ enrolled: true });
    const off = await makeUser({ enrolled: true, active: false });
    const answers = await Promise.all([
      loginWithPassword(good.user.email, 'not the password', ctxFor()),
      loginWithPassword('nobody-here@example.test', 'whatever it is', ctxFor()),
      loginWithPassword(off.user.email, off.password, ctxFor()),
    ]);
    expect(answers).toEqual([{ status: 'invalid' }, { status: 'invalid' }, { status: 'invalid' }]);
  });

  it('creates no session when the password is wrong', async () => {
    const { user } = await makeUser({ enrolled: true });
    await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor());
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('stores only a salted hash of the password', async () => {
    const { user, password } = await makeUser();
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect([row.passwordHash?.startsWith('$2'), row.passwordHash?.includes(password)]).toEqual([true, false]);
  });

  it('matches the email whatever the letter case and surrounding spaces', async () => {
    const { user, password } = await makeUser({ enrolled: true });
    const r = await loginWithPassword(`  ${user.email.toUpperCase()}  `, password, ctxFor());
    expect(r.status).toBe('ok');
  });

  it('refuses an empty email or password without creating anything', async () => {
    const results = await Promise.all([loginWithPassword('', 'x', ctxFor()), loginWithPassword('a@b.test', '', ctxFor()), loginWithPassword(null, null, ctxFor())]);
    expect(results.map((r) => r.status)).toEqual(['invalid', 'invalid', 'invalid']);
  });

  it('is unavailable (not open) when the encryption key is missing', async () => {
    const { user, password } = await makeUser({ enrolled: true });
    expect(await loginWithPassword(user.email, password, ctxFor({ key: null }))).toEqual({ status: 'unavailable' });
  });

  it('records a failed sign-in in the audit log with the address and no actor', async () => {
    const { user } = await makeUser({ enrolled: true });
    const ip = newIp();
    await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor({ ip }));
    const entry = await db.auditLog.findFirst({ where: { action: 'login.failed', entityId: user.id } });
    expect([entry?.ip, entry?.actorId]).toEqual([ip, null]);
  });
});

describe('two-step verification (US-007.2)', () => {
  async function pendingVerify() {
    const made = await makeUser({ enrolled: true });
    const r = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (r.status !== 'ok') throw new Error('sign-in failed');
    return { ...made, token: r.token };
  }

  it('signs in with a current code and opens a full session', async () => {
    const { secret, token } = await pendingVerify();
    const now = new Date();
    const r = await verifySecondFactor(token, { code: await currentTotp(secret!, now.getTime()) }, ctxFor({ now }));
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    const loaded = await loadSession(r.token);
    expect(loaded.ok && loaded.session.stage).toBe('ACTIVE');
  });

  it('ends the pending session when the full one starts (a new cookie value)', async () => {
    const { secret, token } = await pendingVerify();
    const now = new Date();
    const r = await verifySecondFactor(token, { code: await currentTotp(secret!, now.getTime()) }, ctxFor({ now }));
    expect(r.status === 'ok' && r.token !== token).toBe(true);
    expect((await loadSession(token)).ok).toBe(false);
  });

  it('refuses a wrong code and counts it as a failure', async () => {
    const { user, token } = await pendingVerify();
    const r = await verifySecondFactor(token, { code: '000000' }, ctxFor());
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect([r.status, row.failedAttempts]).toEqual(['invalid', 1]);
  });

  it('refuses a code that is not six digits', async () => {
    const { token } = await pendingVerify();
    const results = await Promise.all(['', 'abcdef', '12345', '1234567'].map((code) => verifySecondFactor(token, { code }, ctxFor())));
    expect(results.every((r) => r.status === 'invalid')).toBe(true);
  });

  it('accepts a code only once (no replay)', async () => {
    const made = await makeUser({ enrolled: true });
    const now = new Date();
    const code = await currentTotp(made.secret!, now.getTime());
    const first = await loginWithPassword(made.user.email, made.password, ctxFor());
    const second = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (first.status !== 'ok' || second.status !== 'ok') throw new Error('sign-in failed');
    const a = await verifySecondFactor(first.token, { code }, ctxFor({ now }));
    const b = await verifySecondFactor(second.token, { code }, ctxFor({ now }));
    expect([a.status, b.status]).toEqual(['ok', 'invalid']);
  });

  it('lets only one of two simultaneous submissions of the same code win', async () => {
    const made = await makeUser({ enrolled: true });
    const now = new Date();
    const code = await currentTotp(made.secret!, now.getTime());
    const sessions = await Promise.all([loginWithPassword(made.user.email, made.password, ctxFor()), loginWithPassword(made.user.email, made.password, ctxFor())]);
    const tokens = sessions.map((s) => (s.status === 'ok' ? s.token : ''));
    const results = await Promise.all(tokens.map((t) => verifySecondFactor(t, { code }, ctxFor({ now }))));
    expect(results.map((r) => r.status).sort()).toEqual(['invalid', 'ok']);
  });

  it('tolerates one 30-second step of clock drift, but not more', async () => {
    const made = await makeUser({ enrolled: true });
    const now = new Date();
    const results: string[] = [];
    for (const offsetSec of [-30, 30, -90, 90]) {
      // A fresh user each time, so the replay rule does not interfere.
      const m = await makeUser({ enrolled: true });
      const login = await loginWithPassword(m.user.email, m.password, ctxFor());
      if (login.status !== 'ok') throw new Error('sign-in failed');
      const code = await currentTotp(m.secret!, now.getTime() + offsetSec * 1000);
      results.push((await verifySecondFactor(login.token, { code }, ctxFor({ now }))).status);
    }
    expect([made.user.id.length > 0, results]).toEqual([true, ['ok', 'ok', 'invalid', 'invalid']]);
  });

  it('accepts a recovery code once, then never again', async () => {
    const made = await makeUser({ enrolled: true });
    const code = made.recoveryCodes[0];
    const a = await loginWithPassword(made.user.email, made.password, ctxFor());
    const b = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (a.status !== 'ok' || b.status !== 'ok') throw new Error('sign-in failed');
    const first = await verifySecondFactor(a.token, { recoveryCode: code }, ctxFor());
    const again = await verifySecondFactor(b.token, { recoveryCode: code.toLowerCase() }, ctxFor());
    const left = (await db.user.findUniqueOrThrow({ where: { id: made.user.id } })).recoveryCodeHashes.length;
    expect([first.status, again.status, left]).toEqual(['ok', 'invalid', 7]);
  });

  it('refuses a half-finished sign-in that is out of time', async () => {
    const { secret, token } = await pendingVerify();
    const later = minutes(new Date(), 11);
    const r = await verifySecondFactor(token, { code: await currentTotp(secret!, later.getTime()) }, ctxFor({ now: later }));
    expect(r.status).toBe('expired');
  });

  it('does not accept the code step without a password step first', async () => {
    const r = await verifySecondFactor(null, { code: '123456' }, ctxFor());
    expect(r.status).toBe('expired');
  });
});

describe('authenticator set-up (US-007.2)', () => {
  // The set-up step is reached through the invitation (or reset) link, which starts this kind of session.
  async function pendingEnroll() {
    const made = await makeUser({ enrolled: false });
    const { token } = await createSession(db, made.user.id, 'PENDING_ENROLL', { ip: '127.0.0.1' });
    return { ...made, token };
  }

  it('shows a secret and QR code, and the same secret again until it is confirmed', async () => {
    const { token } = await pendingEnroll();
    const a = await beginEnrollment(token, ctxFor());
    const b = await beginEnrollment(token, ctxFor());
    expect(a.status === 'ok' && b.status === 'ok' && a.secret === b.secret && a.qr.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('keeps the secret encrypted in the database', async () => {
    const { user, token } = await pendingEnroll();
    const shown = await beginEnrollment(token, ctxFor());
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect([shown.status === 'ok' && row.totpSecret?.includes(shown.secret), row.totpSecret?.startsWith('v1.'), decryptSecret(row.totpSecret!, KEY).length > 10]).toEqual([false, true, true]);
  });

  it('does not switch two-step on until a valid code is confirmed', async () => {
    const { user, token } = await pendingEnroll();
    await beginEnrollment(token, ctxFor());
    const bad = await confirmEnrollment(token, '000000', ctxFor());
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect([bad.status, row.totpEnabled]).toEqual(['invalid', false]);
  });

  it('confirms with a valid code: signs in, shows 8 recovery codes once and stores only hashes', async () => {
    const { user, token } = await pendingEnroll();
    const shown = await beginEnrollment(token, ctxFor());
    if (shown.status !== 'ok') throw new Error('no secret');
    const now = new Date();
    const done = await confirmEnrollment(token, await currentTotp(shown.secret, now.getTime()), ctxFor({ now }));
    if (done.status !== 'ok') throw new Error(`not confirmed: ${done.status}`);
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect([done.recoveryCodes.length, row.totpEnabled, row.recoveryCodeHashes.length, row.recoveryCodeHashes.some((h) => done.recoveryCodes.includes(h))]).toEqual([8, true, 8, false]);
    const loaded = await loadSession(done.token);
    expect(loaded.ok && loaded.session.stage).toBe('ACTIVE');
  });

  it('the recovery codes shown work for a later sign-in', async () => {
    const { user, password, token } = await pendingEnroll();
    const shown = await beginEnrollment(token, ctxFor());
    if (shown.status !== 'ok') throw new Error('no secret');
    const now = new Date();
    const done = await confirmEnrollment(token, await currentTotp(shown.secret, now.getTime()), ctxFor({ now }));
    if (done.status !== 'ok') throw new Error('not confirmed');
    const login = await loginWithPassword(user.email, password, ctxFor());
    if (login.status !== 'ok') throw new Error(`sign-in failed: ${login.status}`);
    expect((await verifySecondFactor(login.token, { recoveryCode: done.recoveryCodes[3] }, ctxFor())).status).toBe('ok');
  });

  it('cannot be skipped: the pending session is not a full session', async () => {
    const { token } = await pendingEnroll();
    const loaded = await loadSession(token);
    expect(loaded.ok && loaded.session.stage).toBe('PENDING_ENROLL');
  });

  it('refuses to show the secret again once two-step is on', async () => {
    const made = await makeUser({ enrolled: true });
    const login = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (login.status !== 'ok') throw new Error('sign-in failed');
    expect((await beginEnrollment(login.token, ctxFor())).status).toBe('expired');
  });
});

describe('lockout after repeated failures (US-007.3)', () => {
  it('locks on the fifth failure and refuses the sixth even with the right password', async () => {
    const { user, password } = await makeUser({ enrolled: true });
    const results: string[] = [];
    for (let i = 0; i < 5; i++) results.push((await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor())).status);
    results.push((await loginWithPassword(user.email, password, ctxFor())).status);
    expect(results).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'locked', 'locked']);
  });

  it('writes one "account locked" entry with the account and the address', async () => {
    const { user } = await makeUser({ enrolled: true });
    const ip = newIp();
    for (let i = 0; i < 6; i++) await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor({ ip }));
    const entries = await db.auditLog.findMany({ where: { action: 'account.locked', entityId: user.id } });
    expect([entries.length, entries[0]?.ip]).toEqual([1, ip]);
  });

  it('lets the user try again after 15 minutes and starts the count from zero', async () => {
    const { user, password } = await makeUser({ enrolled: true });
    const t0 = new Date();
    for (let i = 0; i < 5; i++) await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor({ now: t0 }));
    const early = await loginWithPassword(user.email, password, ctxFor({ now: minutes(t0, 14) }));
    const late = await loginWithPassword(user.email, password, ctxFor({ now: minutes(t0, 16) }));
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect([early.status, late.status, row.failedAttempts, row.lockedUntil]).toEqual(['locked', 'ok', 0, null]);
  });

  it('counts wrong codes too, and resets the count after a complete sign-in', async () => {
    const made = await makeUser({ enrolled: true });
    const login = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (login.status !== 'ok') throw new Error('sign-in failed');
    await verifySecondFactor(login.token, { code: '111111' }, ctxFor());
    await verifySecondFactor(login.token, { code: '222222' }, ctxFor());
    expect((await db.user.findUniqueOrThrow({ where: { id: made.user.id } })).failedAttempts).toBe(2);
    const now = new Date();
    await verifySecondFactor(login.token, { code: await currentTotp(made.secret!, now.getTime()) }, ctxFor({ now }));
    expect((await db.user.findUniqueOrThrow({ where: { id: made.user.id } })).failedAttempts).toBe(0);
  });

  it('stops at five even with ten attempts at the same moment', async () => {
    const { user } = await makeUser({ enrolled: true });
    const results = await Promise.all(Array.from({ length: 10 }, () => loginWithPassword(user.email, 'wrong wrong wrong', ctxFor())));
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const checked = await auditCount({ action: 'login.failed', entityId: user.id });
    // Past a short queue per account the answer is "busy" at once (throttled), so a flood cannot hold all the database connections.
    const refused = results.filter((r) => r.status === 'locked' || r.status === 'throttled').length;
    expect([results.filter((r) => r.status === 'invalid').length, refused, row.failedAttempts, checked]).toEqual([4, 6, 5, 5]);
  });

  it('keeps a locked user out of an open code step too', async () => {
    const made = await makeUser({ enrolled: true });
    const login = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (login.status !== 'ok') throw new Error('sign-in failed');
    for (let i = 0; i < 5; i++) await verifySecondFactor(login.token, { code: '000000' }, ctxFor());
    const now = new Date();
    const r = await verifySecondFactor(login.token, { code: await currentTotp(made.secret!, now.getTime()) }, ctxFor({ now }));
    expect(r.status).toBe('locked');
  });

  it('locks an email that does not exist in the same way, so the answer does not say which emails are real', async () => {
    const ghost = `ghost-${Date.now()}@example.test`;
    const results: string[] = [];
    for (let i = 0; i < 7; i++) results.push((await loginWithPassword(ghost, 'whatever it is', ctxFor())).status);
    expect(results).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'locked', 'locked', 'locked']);
  });

  it('treats an email with wildcard characters as just an unknown email (never as a pattern that matches users)', async () => {
    await makeUser({ enrolled: true });
    const results = await Promise.all(['%', '%@example.test', 'staff-%', '_@_._'].map((e) => loginWithPassword(e, 'correct horse battery staple', ctxFor())));
    expect(results.every((r) => r.status === 'invalid')).toBe(true);
  });

  it('throttles attempts from one address, including against accounts that do not exist', async () => {
    const ip = newIp();
    const results: string[] = [];
    for (let i = 0; i < 22; i++) results.push((await loginWithPassword(`ghost-${i}@example.test`, 'whatever it is', ctxFor({ ip }))).status);
    expect([results.slice(0, 20).every((s) => s === 'invalid'), results.slice(20)]).toEqual([true, ['throttled', 'throttled']]);
  });

  it('lets a Super admin unlock the user so they can sign in at once', async () => {
    const { user, password } = await makeUser({ enrolled: true });
    for (let i = 0; i < 5; i++) await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor());
    const admin = await makeUser({ role: 'SUPER_ADMIN', enrolled: true });
    await unlockUser({ id: admin.user.id, ip: '10.0.0.1' }, user.id);
    expect((await loginWithPassword(user.email, password, ctxFor())).status).toBe('ok');
  });

  it('does not reveal anything about a locked user to someone who is not signed in', async () => {
    const { user } = await makeUser({ enrolled: true });
    for (let i = 0; i < 5; i++) await loginWithPassword(user.email, 'wrong wrong wrong', ctxFor());
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe('sign out (US-007.5)', () => {
  it('ends the session on the server and logs it once, even when called twice', async () => {
    const made = await makeUser({ enrolled: true });
    const login = await loginWithPassword(made.user.email, made.password, ctxFor());
    if (login.status !== 'ok') throw new Error('sign-in failed');
    const now = new Date();
    const done = await verifySecondFactor(login.token, { code: await currentTotp(made.secret!, now.getTime()) }, ctxFor({ now }));
    if (done.status !== 'ok') throw new Error('not signed in');
    await signOut(done.token, ctxFor());
    await signOut(done.token, ctxFor());
    expect([(await loadSession(done.token)).ok, await auditCount({ action: 'logout', entityId: made.user.id })]).toEqual([false, 1]);
  });
});
