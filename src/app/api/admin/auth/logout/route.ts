import { NextResponse } from 'next/server';
import { signOut } from '@/lib/admin/auth-service';
import { jsonResponse } from '@/lib/admin/guard';
import { authContext, clearSessionCookie, sessionTokenOf } from '@/lib/admin/http';
import { isCrossOrigin } from '@/lib/leads/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ends the session on the server and clears the cookie. Calling it twice is fine. */
export async function POST(req: Request) {
  if (isCrossOrigin(req.headers)) return jsonResponse({ error: 'forbidden' }, 403);
  await signOut(sessionTokenOf(req), authContext(req));
  return clearSessionCookie(NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }));
}
