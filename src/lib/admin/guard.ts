import { cookies, headers } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clientIp, isCrossOrigin } from '@/lib/leads/request';
import { SlidingWindowLimiter } from '@/lib/leads/rate-limit';
import { writeAudit } from './audit';
import { safeNext } from './paths';
import { can, type Area } from './permissions';
import { cookieName, isSecureSite, loadSession, tokenFromCookieHeader, type LoadedSession, type SessionUser } from './session';

/** Refused requests are logged, but at most this many per address, so a flood cannot fill the log. */
const deniedLogLimiter = new SlidingWindowLimiter(20, 10 * 60 * 1000);

export async function logDenied(ip: string, area: string, actorId: string | null, why: string): Promise<void> {
  if (!deniedLogLimiter.hit(`${ip}|${actorId ?? '-'}`).allowed) return;
  try {
    await writeAudit(db, { actorId, action: 'access.denied', entityType: 'area', entityId: area, ip, changes: { reason: why } });
  } catch (e) {
    console.error('Could not write the denied-access entry:', e instanceof Error ? e.message : e);
  }
}

const toSessionUser = (loaded: Extract<LoadedSession, { ok: true }>): SessionUser => ({
  id: loaded.user.id,
  email: loaded.user.email,
  name: loaded.user.name,
  role: loaded.user.role,
  sessionId: loaded.session.id,
});

// ───────── pages (server components) ─────────

/** The signed-in state for the current page request, from the cookie. */
export async function currentSession(): Promise<LoadedSession> {
  const store = await cookies();
  const token = store.get(cookieName(isSecureSite()))?.value;
  return loadSession(token);
}

/**
 * Use at the top of every admin page. Not signed in: to the sign-in page (and back here afterwards). Half-way
 * through signing in: to the step that is still open. Signed in but the role may not open this area: 403.
 */
export async function requireAdminPage(area: Area, here: string): Promise<SessionUser> {
  const loaded = await currentSession();
  if (!loaded.ok) {
    const reason = loaded.reason === 'expired' ? '&reason=timeout' : '';
    redirect(`/admin/login?next=${encodeURIComponent(safeNext(here))}${reason}`);
  }
  if (loaded.session.stage === 'PENDING_VERIFY') redirect('/admin/login/verify');
  if (loaded.session.stage === 'PENDING_ENROLL') redirect('/admin/login/enroll');
  if (!can(loaded.user.role, area)) {
    const ip = clientIp(await headers());
    await logDenied(ip, area, loaded.user.id, 'role not allowed');
    forbidden();
  }
  return toSessionUser(loaded);
}

// ───────── API handlers ─────────

export type ApiAuth = { ok: true; user: SessionUser; ip: string } | { ok: false; response: Response };

const noStore = { 'Cache-Control': 'no-store' };
export const jsonResponse = (body: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...noStore, ...extra } });

/**
 * Use at the top of every `/api/admin/*` handler (except the sign-in steps). 401 when there is no full session,
 * 403 when the role may not use this area. Requests that change data must come from this site (not another page).
 */
export async function requireAdminApi(req: Request, area: Area, opts: { mutating?: boolean } = {}): Promise<ApiAuth> {
  const ip = clientIp(req.headers);
  if (opts.mutating && isCrossOrigin(req.headers)) return { ok: false, response: jsonResponse({ error: 'forbidden' }, 403) };
  const loaded = await loadSession(tokenFromCookieHeader(req.headers.get('cookie')));
  if (!loaded.ok || loaded.session.stage !== 'ACTIVE') {
    await logDenied(ip, area, null, 'not signed in');
    return { ok: false, response: jsonResponse({ error: 'unauthenticated' }, 401) };
  }
  if (!can(loaded.user.role, area)) {
    await logDenied(ip, area, loaded.user.id, 'role not allowed');
    return { ok: false, response: jsonResponse({ error: 'forbidden' }, 403) };
  }
  return { ok: true, user: toSessionUser(loaded), ip };
}

/** Reads a small JSON body: 400 when it is empty or not JSON, 413 when it is too big. */
export async function readJson(req: Request, maxBytes = 10_000): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return { ok: false, response: jsonResponse({ error: 'too_large' }, 413) };
  const text = await req.text();
  if (text.length > maxBytes) return { ok: false, response: jsonResponse({ error: 'too_large' }, 413) };
  if (!text.trim()) return { ok: false, response: jsonResponse({ error: 'empty_body' }, 400) };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonResponse({ error: 'bad_json' }, 400) };
  }
}
