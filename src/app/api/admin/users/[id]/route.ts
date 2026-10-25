import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { updateUser } from '@/lib/admin/users-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

/** Changes a name, a role, or active / deactivated. Super admin only. */
export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'users', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const { id } = await params;

  const result = await updateUser({ id: auth.user.id, ip: auth.ip }, id, body.data);
  switch (result.status) {
    case 'ok':
    case 'unchanged':
      return jsonResponse({ user: result.user, changed: result.status === 'ok' });
    case 'not_found':
      return jsonResponse({ error: 'not_found' }, 404);
    case 'last_super_admin':
      return jsonResponse({ error: 'last_super_admin' }, 409);
    default:
      return jsonResponse({ error: 'invalid', errors: result.errors }, 422);
  }
}
