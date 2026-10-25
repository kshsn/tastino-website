import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { inviteLink } from '@/lib/admin/invite-email';
import { resendInvite } from '@/lib/admin/users-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A fresh invitation (new user) or password reset link (existing user); the old link stops working. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req, 'users', { mutating: true });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const result = await resendInvite({ id: auth.user.id, ip: auth.ip }, id);
  if (result.status === 'not_found') return jsonResponse({ error: 'not_found' }, 404);
  if (result.status === 'not_pending') return jsonResponse({ error: 'not_pending' }, 409);
  return jsonResponse({ user: result.user, reset: result.reset, delivery: result.delivery, inviteLink: result.delivery === 'sent' ? undefined : inviteLink(result.inviteToken) });
}
