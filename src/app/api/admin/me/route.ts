import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { allowedAreas } from '@/lib/admin/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who is signed in and which areas their role may open (the navigation shows only those). */
export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'dashboard');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  return jsonResponse({ id: user.id, name: user.name, email: user.email, role: user.role, areas: allowedAreas(user.role) });
}
