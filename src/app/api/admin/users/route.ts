import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { inviteLink } from '@/lib/admin/invite-email';
import { createUser, listUsers } from '@/lib/admin/users-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** All staff accounts (Super admin only). Never includes password hashes, secrets or recovery codes. */
export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'users');
  if (!auth.ok) return auth.response;
  return jsonResponse({ users: await listUsers() });
}

/**
 * Creates a user and sends the invitation. When no email can be sent (or sending fails) the answer carries the
 * link, so the Super admin can pass it on; the link is only ever shown to the Super admin who created it.
 */
export async function POST(req: Request) {
  const auth = await requireAdminApi(req, 'users', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;

  const result = await createUser({ id: auth.user.id, ip: auth.ip }, body.data);
  switch (result.status) {
    case 'created':
      return jsonResponse({ user: result.user, delivery: result.delivery, inviteLink: result.delivery === 'sent' ? undefined : inviteLink(result.inviteToken) }, 201);
    case 'duplicate':
      return jsonResponse({ error: 'duplicate' }, 409);
    default:
      return jsonResponse({ error: 'invalid', errors: result.errors }, 422);
  }
}
