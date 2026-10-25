import { jsonResponse } from '@/lib/admin/guard';
import { authContext, openSignInRequest, withSessionCookie } from '@/lib/admin/http';
import { acceptInvite } from '@/lib/admin/users-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Uses an invitation link: chooses the password, then goes on to the authenticator set-up. */
export async function POST(req: Request) {
  const opened = await openSignInRequest(req);
  if (!opened.ok) return opened.response;
  const token = typeof opened.data.token === 'string' ? opened.data.token : '';

  const result = await acceptInvite(token, opened.data.password, authContext(req));
  switch (result.status) {
    case 'ok':
      return withSessionCookie({ next: `/admin/login/${result.next}` }, result.token, 'pending');
    case 'weak':
      return jsonResponse({ error: 'weak_password', problem: result.problem }, 422);
    case 'unavailable':
      return jsonResponse({ error: 'unavailable' }, 503);
    default:
      return jsonResponse({ error: 'expired' }, 410);
  }
}
