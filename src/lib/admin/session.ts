import type { Role, Session, SessionStage, User } from '@prisma/client';
import { db } from '@/lib/db';
import { ABSOLUTE_TIMEOUT_MS, IDLE_TIMEOUT_MS, PENDING_TIMEOUT_MS, SESSION_COOKIE, SESSION_COOKIE_SECURE, TOUCH_INTERVAL_MS } from './config';
import { newToken, sha256 } from './crypto';
import type { Db } from './audit';

export interface SessionContext {
  ip?: string | null;
  userAgent?: string | null;
  now?: Date;
}

/** `__Host-` cookies need HTTPS; on plain http (local development) the ordinary name is used. */
export const cookieName = (secure: boolean) => (secure ? SESSION_COOKIE_SECURE : SESSION_COOKIE);

export function cookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
}

/** The session cookie value from a raw `Cookie` header (route handlers). */
export function tokenFromCookieHeader(header: string | null | undefined, secure: boolean = isSecureSite()): string | null {
  if (!header) return null;
  // On HTTPS only the `__Host-` cookie is read: a plain cookie with the other name could have been planted by a sibling
  // subdomain or an insecure request, and must never be taken for the session.
  const wanted = cookieName(secure);
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === wanted) return rest.join('=') || null;
  }
  return null;
}

/** True when the site runs on HTTPS (decided by SITE_URL). */
export const isSecureSite = (): boolean => (process.env.SITE_URL ?? '').startsWith('https:');

/** Starts a sign-in. A pending one (password done, code to do) is short-lived; a full one lasts up to 12 hours. */
export async function createSession(client: Db, userId: string, stage: SessionStage, ctx: SessionContext = {}) {
  const now = ctx.now ?? new Date();
  const token = newToken();
  const lifetime = stage === 'ACTIVE' ? ABSOLUTE_TIMEOUT_MS : PENDING_TIMEOUT_MS;
  const session = await client.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      stage,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent?.slice(0, 300) ?? null,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + lifetime),
    },
  });
  return { token, session };
}

export type LoadedSession =
  | { ok: true; session: Session; user: User }
  | { ok: false; reason: 'none' | 'expired' | 'inactive' };

/**
 * Finds the sign-in behind a cookie. It is refused when it was ended, is past its absolute end, has been idle for
 * 30 minutes, or belongs to a deactivated user. A valid full session has its idle timer restarted (at most once a
 * minute, so reading does not mean writing every time). The role is read from the user row on every call, so a role
 * change applies to the very next request.
 */
export async function loadSession(token: string | null | undefined, now: Date = new Date()): Promise<LoadedSession> {
  if (!token) return { ok: false, reason: 'none' };
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.revokedAt) return { ok: false, reason: 'none' };
  if (session.expiresAt <= now) return { ok: false, reason: 'expired' };
  if (!session.user.active) return { ok: false, reason: 'inactive' };
  if (session.stage === 'ACTIVE') {
    if (now.getTime() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) return { ok: false, reason: 'expired' };
    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await db.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
    }
  }
  const { user, ...rest } = session;
  return { ok: true, session: rest, user };
}

export async function revokeSession(client: Db, sessionId: string, now: Date = new Date()): Promise<boolean> {
  const done = await client.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: now } });
  return done.count > 0;
}

/** Ends every sign-in of a user (role change, deactivation, 2FA reset). */
export async function revokeAllSessions(client: Db, userId: string, now: Date = new Date()): Promise<number> {
  const done = await client.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
  return done.count;
}

export type SessionUser = { id: string; email: string; name: string; role: Role; sessionId: string };
