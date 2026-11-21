import bcrypt from 'bcryptjs';
import type { Role, User } from '@prisma/client';
import { db } from '@/lib/db';
import { loginLimiter, type AuthContext } from '@/lib/admin/auth-service';
import { SESSION_COOKIE } from '@/lib/admin/config';
import { encryptSecret, newRecoveryCodes, parseKey } from '@/lib/admin/crypto';
import { createSession } from '@/lib/admin/session';
import { newTotpSecret } from '@/lib/admin/totp';

/** The fixed key the integration config provides (never a real one). */
export const KEY = parseKey(process.env.ADMIN_ENCRYPTION_KEY)!;

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(++counter).toString(36)}`;

/** A new address per call, so no test shares the sign-in rate limit of another. */
export const newIp = () => `10.${(counter = (counter + 1) % 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

/** Forgets every counted sign-in step (the limiter lives in the memory of the test process). */
export function resetLimiters() {
  (loginLimiter as unknown as { hits: Map<string, number[]> }).hits.clear();
}

export interface MadeUser {
  user: User;
  password: string;
  /** Plain authenticator secret (only when enrolled). */
  secret: string | null;
  recoveryCodes: string[];
}

/**
 * A user straight in the database. The password hash uses a low bcrypt cost so the tests stay fast; the check
 * reads the cost from the hash, so this exercises the real comparison.
 */
export async function makeUser(opts: { role?: Role; enrolled?: boolean; active?: boolean; password?: string | null; name?: string; email?: string } = {}): Promise<MadeUser> {
  const password = opts.password === undefined ? 'correct horse battery staple' : opts.password;
  const secret = opts.enrolled ? newTotpSecret() : null;
  const codes = opts.enrolled ? newRecoveryCodes() : { plain: [], hashes: [] };
  const user = await db.user.create({
    data: {
      email: opts.email ?? `staff-${unique()}@example.test`,
      name: opts.name ?? 'Test Staff',
      role: opts.role ?? 'SALES',
      active: opts.active ?? true,
      passwordHash: password === null ? null : await bcrypt.hash(password, 4),
      totpSecret: secret ? encryptSecret(secret, KEY) : null,
      totpEnabled: !!secret,
      recoveryCodeHashes: codes.hashes,
    },
  });
  return { user, password: password ?? '', secret, recoveryCodes: codes.plain };
}

export const ctxFor = (over: Partial<AuthContext> = {}): AuthContext => ({ ip: newIp(), userAgent: 'vitest', key: KEY, ...over });

/** A signed-in (full) session for a user, and the cookie that carries it. */
export async function signedIn(user: User, now?: Date) {
  const { token, session } = await createSession(db, user.id, 'ACTIVE', { ip: '127.0.0.1', now });
  return { token, session, cookie: `${SESSION_COOKIE}=${token}` };
}

/** A request like the browser sends it. */
export function request(path: string, opts: { method?: string; cookie?: string; body?: unknown; headers?: Record<string, string>; ip?: string } = {}): Request {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { host: 'localhost:3000', 'x-real-ip': opts.ip ?? newIp(), ...(opts.headers ?? {}) };
  if (opts.cookie) headers.cookie = opts.cookie;
  const hasBody = opts.body !== undefined;
  if (hasBody) headers['content-type'] = 'application/json';
  return new Request(`http://localhost:3000${path}`, { method, headers, body: hasBody ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined });
}

export const params = (id: string) => ({ params: Promise.resolve({ id }) });

export const minutes = (from: Date, m: number) => new Date(from.getTime() + m * 60_000);

let leadCounter = 0;

/** A lead straight in the database (the public form is tested elsewhere). */
export async function makeLead(over: Partial<Parameters<typeof db.lead.create>[0]['data']> & { country?: string } = {}) {
  const n = ++leadCounter;
  const base = {
    reference: `TF-T-${Date.now().toString(36)}-${n}`,
    reason: 'DISTRIBUTOR' as const,
    name: `Buyer ${n}`,
    email: `buyer${n}-${Date.now().toString(36)}@example.test`,
    company: `Company ${n}`,
    country: 'Egypt',
    message: 'We would like to distribute your products.',
    locale: 'en',
    consent: true,
    consentAt: new Date(),
    consentTextVersion: '2026-10-v1',
  };
  return db.lead.create({ data: { ...base, ...over } as Parameters<typeof db.lead.create>[0]['data'] });
}
