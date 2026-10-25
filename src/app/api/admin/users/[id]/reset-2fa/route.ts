import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { resetTwoFactor } from '@/lib/admin/users-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The user must enrol their authenticator app again at the next sign-in; their sessions end now. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req, 'users', { mutating: true });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const result = await resetTwoFactor({ id: auth.user.id, ip: auth.ip }, id);
  return result.status === 'not_found' ? jsonResponse({ error: 'not_found' }, 404) : jsonResponse({ user: result.user });
}
