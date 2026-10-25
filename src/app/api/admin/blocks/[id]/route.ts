import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { getPageBlockById, savePageBlock } from '@/lib/admin/content-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  const block = await getPageBlockById((await params).id);
  return block ? jsonResponse({ block }) : jsonResponse({ error: 'not_found' }, 404);
}

/** Edits the text of a block. A second editor who saves from an older copy gets 409 with the newer text. */
export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 60_000);
  if (!body.ok) return body.response;
  const r = await savePageBlock({ id: auth.user.id, ip: auth.ip }, (await params).id, body.data);
  switch (r.status) {
    case 'ok':
      return jsonResponse(r);
    case 'conflict':
      return jsonResponse({ error: 'conflict', block: r.block }, 409);
    case 'invalid':
      return jsonResponse({ error: 'invalid', errors: r.errors }, 422);
    default:
      return jsonResponse({ error: 'not_found' }, 404);
  }
}
