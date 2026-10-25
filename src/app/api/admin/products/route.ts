import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { listCategories, listProducts, saveProduct } from '@/lib/admin/content-service';
import { saveResponse } from '@/lib/admin/save-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  return jsonResponse({ products, categories });
}

/** Creates a product (with its variants) as a draft, in one transaction. */
export async function POST(req: Request) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 40_000);
  if (!body.ok) return body.response;
  return saveResponse(await saveProduct({ id: auth.user.id, ip: auth.ip }, null, body.data), true);
}
