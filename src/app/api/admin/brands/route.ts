import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { listBrands, saveBrand } from '@/lib/admin/content-service';
import { saveResponse } from '@/lib/admin/save-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  return jsonResponse({ brands: await listBrands() });
}

/** Creates a brand as a draft. */
export async function POST(req: Request) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 20_000);
  if (!body.ok) return body.response;
  return saveResponse(await saveBrand({ id: auth.user.id, ip: auth.ip }, null, body.data), true);
}
