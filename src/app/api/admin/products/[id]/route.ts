import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { getProduct, saveProduct } from '@/lib/admin/content-service';
import { saveResponse } from '@/lib/admin/save-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  const product = await getProduct((await params).id);
  return product ? jsonResponse({ product }) : jsonResponse({ error: 'not_found' }, 404);
}

export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 40_000);
  if (!body.ok) return body.response;
  return saveResponse(await saveProduct({ id: auth.user.id, ip: auth.ip }, (await params).id, body.data));
}
