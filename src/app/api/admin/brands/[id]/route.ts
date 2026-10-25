import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { getBrand, saveBrand } from '@/lib/admin/content-service';
import { saveResponse } from '@/lib/admin/save-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  const brand = await getBrand((await params).id);
  return brand ? jsonResponse({ brand }) : jsonResponse({ error: 'not_found' }, 404);
}

export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 20_000);
  if (!body.ok) return body.response;
  return saveResponse(await saveBrand({ id: auth.user.id, ip: auth.ip }, (await params).id, body.data));
}

/** Brands are hidden or unpublished, never deleted. */
export async function DELETE(req: Request) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  return jsonResponse({ error: 'not_allowed', message: 'Brands cannot be deleted; hide or unpublish them.' }, 405, { Allow: 'GET, PATCH' });
}
