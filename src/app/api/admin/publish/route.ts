import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { isPublishableEntity, publishItem } from '@/lib/admin/content-service';
import { saveResponse } from '@/lib/admin/save-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** `{ entity: 'brand' | 'product' | 'heroSlide' | 'pageBlock', id, status: 'PUBLISHED' | 'DRAFT' }`. */
export async function POST(req: Request) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const { entity, id, status } = (body.data ?? {}) as Record<string, unknown>;
  if (!isPublishableEntity(entity) || typeof id !== 'string' || !/^[\w-]{1,40}$/.test(id) || (status !== 'PUBLISHED' && status !== 'DRAFT')) {
    return jsonResponse({ error: 'invalid' }, 422);
  }
  return saveResponse(await publishItem({ id: auth.user.id, ip: auth.ip }, entity, id, status));
}
