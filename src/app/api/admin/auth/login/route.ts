import { loginWithPassword } from '@/lib/admin/auth-service';
import { jsonResponse } from '@/lib/admin/guard';
import { authContext, openSignInRequest, retryHeaders, withSessionCookie } from '@/lib/admin/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Step 1 of signing in. Every refusal for a wrong email or password is the same 401, so nothing says which was wrong. */
export async function POST(req: Request) {
  const opened = await openSignInRequest(req);
  if (!opened.ok) return opened.response;

  const result = await loginWithPassword(opened.data.email, opened.data.password, authContext(req));
  switch (result.status) {
    case 'ok':
      return withSessionCookie({ next: result.next }, result.token, 'pending');
    case 'locked':
      return jsonResponse({ error: 'locked', retryAfterSec: result.retryAfterSec }, 423, retryHeaders(result.retryAfterSec));
    case 'throttled':
      return jsonResponse({ error: 'rate_limited' }, 429, retryHeaders(result.retryAfterSec));
    case 'not_enrolled':
      return jsonResponse({ error: 'not_enrolled' }, 403);
    case 'unavailable':
      return jsonResponse({ error: 'unavailable' }, 503);
    default:
      return jsonResponse({ error: 'invalid' }, 401);
  }
}
