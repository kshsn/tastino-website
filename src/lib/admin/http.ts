import { NextResponse } from 'next/server';
import { env } from '@/env';
import { clientIp, isCrossOrigin } from '@/lib/leads/request';
import { jsonResponse, readJson } from './guard';
import { ABSOLUTE_TIMEOUT_MS, PENDING_TIMEOUT_MS } from './config';
import { cookieName, cookieOptions, tokenFromCookieHeader } from './session';
import type { AuthContext } from './auth-service';

const secure = () => env.SITE_URL.startsWith('https:');

export const authContext = (req: Request): AuthContext => ({ ip: clientIp(req.headers), userAgent: req.headers.get('user-agent') });

export const sessionTokenOf = (req: Request): string | null => tokenFromCookieHeader(req.headers.get('cookie'));

/** A JSON answer that also sets the session cookie (a pending one lives minutes, a full one up to 12 hours). */
export function withSessionCookie(body: unknown, token: string, stage: 'pending' | 'active', status = 200): NextResponse {
  const res = NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const maxAge = Math.floor((stage === 'active' ? ABSOLUTE_TIMEOUT_MS : PENDING_TIMEOUT_MS) / 1000);
  res.cookies.set(cookieName(secure()), token, { ...cookieOptions(secure()), maxAge });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(cookieName(secure()), '', { ...cookieOptions(secure()), maxAge: 0 });
  return res;
}

/** Common start of the sign-in endpoints: refuse other sites, read the JSON body. */
export async function openSignInRequest(req: Request): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; response: Response }> {
  if (isCrossOrigin(req.headers)) return { ok: false, response: jsonResponse({ error: 'forbidden' }, 403) };
  const body = await readJson(req);
  if (!body.ok) return body;
  const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? (body.data as Record<string, unknown>) : {};
  return { ok: true, data };
}

export const retryHeaders = (seconds: number): Record<string, string> => ({ 'Retry-After': String(seconds) });
