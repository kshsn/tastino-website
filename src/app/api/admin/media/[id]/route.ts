import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { deleteMedia, updateMediaAlt } from '@/lib/admin/media-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const r = await updateMediaAlt({ id: auth.user.id, ip: auth.ip }, (await params).id, body.data);
  if (r.status === 'ok') return jsonResponse({ asset: r.asset });
  return r.status === 'invalid' ? jsonResponse({ error: 'invalid', errors: r.errors }, 422) : jsonResponse({ error: 'not_found' }, 404);
}

/** An image used by a brand, product or slide cannot be deleted; the answer lists where it is used. */
export async function DELETE(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const r = await deleteMedia({ id: auth.user.id, ip: auth.ip }, (await params).id);
  if (r.status === 'ok') return jsonResponse({ status: 'ok' });
  return r.status === 'in_use' ? jsonResponse({ error: 'in_use', usage: r.usage }, 409) : jsonResponse({ error: 'not_found' }, 404);
}
