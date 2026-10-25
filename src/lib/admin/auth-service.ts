import type { Prisma, User } from '@prisma/client';
import { env } from '@/env';
import { db } from '@/lib/db';
import { SlidingWindowLimiter } from '@/lib/leads/rate-limit';
import { writeAudit } from './audit';
import { LOCKOUT_MS, MAX_FAILED_ATTEMPTS } from './config';
import { decryptSecret, encryptSecret, hashRecoveryCode, newRecoveryCodes, parseKey } from './crypto';
import { verifyPassword } from './password';
import { createSession, loadSession, revokeSession } from './session';
import { checkTotp, newTotpSecret, qrDataUrl, totpUri } from './totp';

/** Sign-in steps per address: stops password guessing against accounts that do not exist (US-007.3). */
export const loginLimiter = new SlidingWindowLimiter(20, 10 * 60 * 1000);

export interface AuthContext {
  ip: string;
  userAgent?: string | null;
  now?: Date;
  /** For tests; normally the key comes from ADMIN_ENCRYPTION_KEY. */
  key?: Buffer | null;
}

const keyOf = (ctx: AuthContext): Buffer | null => (ctx.key !== undefined ? ctx.key : parseKey(env.ADMIN_ENCRYPTION_KEY));
const nowOf = (ctx: AuthContext): Date => ctx.now ?? new Date();

// Long enough for a burst of parallel attempts to queue behind the per-user lock.
const TX_OPTIONS = { timeout: 30_000, maxWait: 30_000 } as const;

/**
 * Runs `fn` while holding a lock that is specific to one user. Sign-in attempts for the same account are therefore
 * handled one at a time: ten parallel guesses still stop at five, because the sixth one sees the lock already set.
 * Inside `fn`, use only the `tx` connection: the connection pool is small, and a second connection could wait for
 * one that is itself waiting for this lock.
 */
export async function withUserLock<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>, busy?: T): Promise<T> {
  // Many attempts at the same account at once would each hold one of the few database connections while they wait.
  // Past a small queue the answer is "busy" at once, so a flood against one account cannot starve the public site.
  const waiting = queued.get(userId) ?? 0;
  if (busy !== undefined && waiting >= MAX_QUEUED) return busy;
  queued.set(userId, waiting + 1);
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      return fn(tx);
    }, TX_OPTIONS);
  } finally {
    const left = (queued.get(userId) ?? 1) - 1;
    if (left <= 0) queued.delete(userId);
    else queued.set(userId, left);
  }
}

const MAX_QUEUED = 6;
const queued = new Map<string, number>();
const BUSY = { status: 'throttled', retryAfterSec: 30 } as const;

export function normalizeLoginEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 ? email : null;
}

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const secondsLeft = (until: Date, now: Date) => Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000));

export type LoginResult =
  | { status: 'ok'; next: 'verify' | 'enroll'; token: string }
  | { status: 'invalid' }
  | { status: 'locked'; retryAfterSec: number }
  | { status: 'throttled'; retryAfterSec: number }
  | { status: 'not_enrolled' }
  | { status: 'unavailable' };

type Refused = { status: 'invalid' } | { status: 'locked'; retryAfterSec: number };

/** Counts one failed step. The fifth in a row locks the account for 15 minutes. */
async function recordFailure(tx: Prisma.TransactionClient, user: User, attemptsBefore: number, now: Date, ctx: AuthContext, step: string): Promise<Refused> {
  const failed = attemptsBefore + 1;
  const lock = failed >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = lock ? new Date(now.getTime() + LOCKOUT_MS) : null;
  await tx.user.update({ where: { id: user.id }, data: { failedAttempts: failed, lockedUntil } });
  await writeAudit(tx, { action: 'login.failed', entityType: 'user', entityId: user.id, ip: ctx.ip, changes: { step } });
  if (lock) {
    await writeAudit(tx, { action: 'account.locked', entityType: 'user', entityId: user.id, ip: ctx.ip, changes: { failedAttempts: failed } });
    return { status: 'locked', retryAfterSec: secondsLeft(lockedUntil!, now) };
  }
  return { status: 'invalid' };
}

// An email that does not exist behaves like a real account: four plain refusals, then "locked" for 15 minutes. Otherwise
// the lock answer itself would tell a guesser which emails are real (kept in memory; one PM2 process).
const ghosts = new Map<string, { n: number; lockedUntil: number }>();
const ghostAuditLimiter = new SlidingWindowLimiter(200, 10 * 60 * 1000);

function ghostLocked(email: string, nowMs: number): number | null {
  const g = ghosts.get(email);
  return g && g.lockedUntil > nowMs ? g.lockedUntil : null;
}

function ghostFailure(email: string, nowMs: number): Refused {
  if (ghosts.size > 5000) for (const [k, v] of ghosts) if (v.lockedUntil <= nowMs) ghosts.delete(k);
  if (ghosts.size > 5000) return { status: 'invalid' }; // never grow without limit
  const g = ghosts.get(email);
  const n = (g && (g.lockedUntil > nowMs || g.n < MAX_FAILED_ATTEMPTS) ? g.n : 0) + 1;
  if (n >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = nowMs + LOCKOUT_MS;
    ghosts.set(email, { n, lockedUntil });
    return { status: 'locked', retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) };
  }
  ghosts.set(email, { n, lockedUntil: 0 });
  return { status: 'invalid' };
}

/** Failure count to start from: a lock that has run out starts again from zero. */
const attemptsNow = (user: User, now: Date) => (user.lockedUntil && user.lockedUntil <= now ? 0 : user.failedAttempts);

/**
 * Step 1: email and password. Success starts a pending session only (no admin page is reachable yet) and says
 * whether the code step or the enrolment step comes next. Every refusal is the same generic "invalid".
 */
export async function loginWithPassword(email: unknown, password: unknown, ctx: AuthContext): Promise<LoginResult> {
  if (!keyOf(ctx)) return { status: 'unavailable' };
  const now = nowOf(ctx);
  const limit = loginLimiter.hit(ctx.ip);
  if (!limit.allowed) return { status: 'throttled', retryAfterSec: limit.retryAfterSec };

  const normalized = normalizeLoginEmail(email);
  const pw = typeof password === 'string' && password.length > 0 && password.length <= 1024 ? password : null;
  if (!normalized || !pw) return { status: 'invalid' };

  // Emails are stored in lower case (and a unique index on lower(email) backs that up), so an exact match is enough.
  const known = await db.user.findFirst({ where: { email: normalized }, select: { id: true } });
  if (!known) {
    const lockedUntil = ghostLocked(normalized, now.getTime());
    if (lockedUntil) return { status: 'locked', retryAfterSec: secondsLeft(new Date(lockedUntil), now) };
    await verifyPassword(pw, null); // same time as a real check
    // Unknown-account attempts are logged, but with a ceiling so a flood cannot fill the (append-only) log.
    if (ghostAuditLimiter.hit('all').allowed) {
      await writeAudit(db, { action: 'login.failed', entityType: 'user', ip: ctx.ip, changes: looksLikeEmail(normalized) && normalized.length <= 100 ? { email: normalized, reason: 'unknown account' } : { reason: 'unknown account' } });
    }
    return ghostFailure(normalized, now.getTime());
  }

  return withUserLock(known.id, async (tx): Promise<LoginResult> => {
    const user = await tx.user.findUnique({ where: { id: known.id } });
    if (!user) return { status: 'invalid' };
    if (user.lockedUntil && user.lockedUntil > now) return { status: 'locked', retryAfterSec: secondsLeft(user.lockedUntil, now) };

    const before = attemptsNow(user, now);
    // A deactivated or not yet activated account still spends the same time and gets the same answer.
    const good = await verifyPassword(pw, user.active ? user.passwordHash : null);
    if (!good) return recordFailure(tx, user, before, now, ctx, 'password');

    if (before !== user.failedAttempts || user.lockedUntil) await tx.user.update({ where: { id: user.id }, data: { failedAttempts: before, lockedUntil: null } });
    // The password alone never opens the authenticator set-up: that is only reachable through the invitation or reset
    // link, so someone who learns a password cannot enrol their own authenticator on a half-finished account.
    if (!user.totpEnabled) return { status: 'not_enrolled' };
    const { token } = await createSession(tx, user.id, 'PENDING_VERIFY', { ip: ctx.ip, userAgent: ctx.userAgent, now });
    return { status: 'ok', next: 'verify', token };
  }, BUSY);
}

export type FinishResult = { status: 'ok'; token: string };

/** Ends the pending session and starts the real one (a new cookie value, so nothing from before carries over). */
async function finishSignIn(tx: Prisma.TransactionClient, user: User, pendingSessionId: string, ctx: AuthContext, method: string): Promise<FinishResult> {
  const now = nowOf(ctx);
  await revokeSession(tx, pendingSessionId, now);
  await tx.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
  const { token } = await createSession(tx, user.id, 'ACTIVE', { ip: ctx.ip, userAgent: ctx.userAgent, now });
  await writeAudit(tx, { actorId: user.id, action: 'login.success', entityType: 'user', entityId: user.id, ip: ctx.ip, changes: { method } });
  return { status: 'ok', token };
}

export type SecondFactorResult = FinishResult | { status: 'invalid' } | { status: 'locked'; retryAfterSec: number } | { status: 'throttled'; retryAfterSec: number } | { status: 'expired' } | { status: 'unavailable' };

/** Step 2: a code from the authenticator app, or one recovery code. A code works once; a recovery code works once. */
export async function verifySecondFactor(sessionToken: string | null, input: { code?: unknown; recoveryCode?: unknown }, ctx: AuthContext): Promise<SecondFactorResult> {
  const key = keyOf(ctx);
  if (!key) return { status: 'unavailable' };
  const now = nowOf(ctx);
  const limit = loginLimiter.hit(ctx.ip);
  if (!limit.allowed) return { status: 'throttled', retryAfterSec: limit.retryAfterSec };

  const loaded = await loadSession(sessionToken, now);
  if (!loaded.ok || loaded.session.stage !== 'PENDING_VERIFY') return { status: 'expired' };
  const sessionId = loaded.session.id;

  return withUserLock(loaded.user.id, async (tx): Promise<SecondFactorResult> => {
    const user = await tx.user.findUnique({ where: { id: loaded.user.id } });
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!user || !user.active || !session || session.revokedAt) return { status: 'expired' };
    if (user.lockedUntil && user.lockedUntil > now) return { status: 'locked', retryAfterSec: secondsLeft(user.lockedUntil, now) };
    const before = attemptsNow(user, now);

    let good = false;
    let method = 'totp';
    if (typeof input.recoveryCode === 'string' && input.recoveryCode.trim()) {
      method = 'recovery code';
      const hash = hashRecoveryCode(input.recoveryCode);
      // Removing the hash and checking it was there is one statement, so a code cannot be spent twice.
      const used = await tx.$executeRaw`UPDATE "User" SET "recoveryCodeHashes" = array_remove("recoveryCodeHashes", ${hash}) WHERE "id" = ${user.id} AND ${hash} = ANY("recoveryCodeHashes")`;
      good = used === 1;
    } else if (typeof input.code === 'string' && user.totpSecret) {
      const check = await checkTotp(decryptSecret(user.totpSecret, key), input.code.trim(), now.getTime());
      if (check.valid) {
        const claimed = await tx.$executeRaw`UPDATE "User" SET "lastTotpStep" = ${check.step} WHERE "id" = ${user.id} AND ("lastTotpStep" IS NULL OR "lastTotpStep" < ${check.step})`;
        good = claimed === 1;
      }
    }
    if (!good) return recordFailure(tx, user, before, now, ctx, '2fa');
    return finishSignIn(tx, user, sessionId, ctx, method);
  }, BUSY);
}

export type EnrollStart = { status: 'ok'; secret: string; qr: string; email: string } | { status: 'expired' } | { status: 'unavailable' } | { status: 'forbidden' };

/** Shows the secret (as a QR code and as text). The same secret is shown again until the first code is confirmed. */
export async function beginEnrollment(sessionToken: string | null, ctx: AuthContext): Promise<EnrollStart> {
  const key = keyOf(ctx);
  if (!key) return { status: 'unavailable' };
  const loaded = await loadSession(sessionToken, nowOf(ctx));
  if (!loaded.ok || loaded.session.stage !== 'PENDING_ENROLL') return { status: 'expired' };
  if (loaded.user.totpEnabled) return { status: 'forbidden' };

  let stored = loaded.user.totpSecret;
  if (!stored) {
    const fresh = encryptSecret(newTotpSecret(), key);
    // Only the first writer wins, so two tabs cannot end up with two different secrets.
    await db.user.updateMany({ where: { id: loaded.user.id, totpSecret: null }, data: { totpSecret: fresh } });
    stored = (await db.user.findUniqueOrThrow({ where: { id: loaded.user.id }, select: { totpSecret: true } })).totpSecret;
  }
  const secret = decryptSecret(stored!, key);
  return { status: 'ok', secret, qr: await qrDataUrl(totpUri(secret, loaded.user.email)), email: loaded.user.email };
}

export type EnrollConfirm = { status: 'ok'; token: string; recoveryCodes: string[] } | { status: 'invalid' } | { status: 'locked'; retryAfterSec: number } | { status: 'throttled'; retryAfterSec: number } | { status: 'expired' } | { status: 'unavailable' };

/**
 * Confirms the first code. Only then is two-step sign-in switched on, the eight recovery codes created (their
 * hashes are stored, the codes themselves are returned once), and the user signed in.
 */
export async function confirmEnrollment(sessionToken: string | null, code: unknown, ctx: AuthContext): Promise<EnrollConfirm> {
  const key = keyOf(ctx);
  if (!key) return { status: 'unavailable' };
  const now = nowOf(ctx);
  const limit = loginLimiter.hit(ctx.ip);
  if (!limit.allowed) return { status: 'throttled', retryAfterSec: limit.retryAfterSec };
  const loaded = await loadSession(sessionToken, now);
  if (!loaded.ok || loaded.session.stage !== 'PENDING_ENROLL') return { status: 'expired' };
  const sessionId = loaded.session.id;

  return withUserLock(loaded.user.id, async (tx): Promise<EnrollConfirm> => {
    const user = await tx.user.findUnique({ where: { id: loaded.user.id } });
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!user || !user.active || !session || session.revokedAt || user.totpEnabled || !user.totpSecret) return { status: 'expired' };
    if (user.lockedUntil && user.lockedUntil > now) return { status: 'locked', retryAfterSec: secondsLeft(user.lockedUntil, now) };
    const before = attemptsNow(user, now);

    const check = typeof code === 'string' ? await checkTotp(decryptSecret(user.totpSecret, key), code.trim(), now.getTime()) : { valid: false as const };
    if (!check.valid) return recordFailure(tx, user, before, now, ctx, 'enrolment code');

    const codes = newRecoveryCodes();
    await tx.user.update({ where: { id: user.id }, data: { totpEnabled: true, lastTotpStep: check.step, recoveryCodeHashes: codes.hashes } });
    await writeAudit(tx, { actorId: user.id, action: '2fa.enrolled', entityType: 'user', entityId: user.id, ip: ctx.ip });
    const done = await finishSignIn(tx, { ...user, totpEnabled: true }, sessionId, ctx, 'enrolment');
    return { status: 'ok', token: done.token, recoveryCodes: codes.plain };
  }, BUSY);
}

/** Ends the sign-in for good (server side). Signing out twice is fine and is logged once. */
export async function signOut(sessionToken: string | null, ctx: AuthContext): Promise<void> {
  const now = nowOf(ctx);
  const loaded = await loadSession(sessionToken, now);
  if (!loaded.ok) return;
  await db.$transaction(async (tx) => {
    const ended = await revokeSession(tx, loaded.session.id, now);
    if (ended && loaded.session.stage === 'ACTIVE') {
      await writeAudit(tx, { actorId: loaded.user.id, action: 'logout', entityType: 'user', entityId: loaded.user.id, ip: ctx.ip });
    }
  });
}
