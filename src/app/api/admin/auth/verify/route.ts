import { verifySecondFactor } from '@/lib/admin/auth-service';
import { jsonResponse } from '@/lib/admin/guard';
import { authContext, openSignInRequest, retryHeaders, sessionTokenOf, withSessionCookie } from '@/lib/admin/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Step 2: the 6-digit code from the authenticator app, or one recovery code. */
export async function POST(req: Request) {
  const opened = await openSignInRequest(req);
  if (!opened.ok) return opened.response;

  const result = await verifySecondFactor(sessionTokenOf(req), { code: opened.data.code, recoveryCode: opened.data.recoveryCode }, authContext(req));
  switch (result.status) {
    case 'ok':
      return withSessionCookie({ next: '/admin' }, result.token, 'active');
    case 'locked':
      return jsonResponse({ error: 'locked', retryAfterSec: result.retryAfterSec }, 423, retryHeaders(result.retryAfterSec));
    case 'throttled':
      return jsonResponse({ error: 'rate_limited' }, 429, retryHeaders(result.retryAfterSec));
    case 'expired':
      return jsonResponse({ error: 'expired' }, 401);
    case 'unavailable':
      return jsonResponse({ error: 'unavailable' }, 503);
    default:
      return jsonResponse({ error: 'invalid' }, 401);
  }
}
