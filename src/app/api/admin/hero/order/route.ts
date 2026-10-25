import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { reorderHeroSlides } from '@/lib/admin/content-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Saves the slide order: `{ ids: [...] }` listing every slide once. Anything else leaves the order as it was. */
export async function PUT(req: Request) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const r = await reorderHeroSlides({ id: auth.user.id, ip: auth.ip }, (body.data as { ids?: unknown } | null)?.ids);
  return r.status === 'ok' ? jsonResponse({ status: 'ok' }) : jsonResponse({ error: 'invalid' }, 422);
}
