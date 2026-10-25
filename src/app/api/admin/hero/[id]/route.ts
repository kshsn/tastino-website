import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { getHeroSlide, saveHeroSlide } from '@/lib/admin/content-service';
import { saveResponse } from '@/lib/admin/save-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content');
  if (!auth.ok) return auth.response;
  const slide = await getHeroSlide((await params).id);
  return slide ? jsonResponse({ slide }) : jsonResponse({ error: 'not_found' }, 404);
}

export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'content', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 20_000);
  if (!body.ok) return body.response;
  return saveResponse(await saveHeroSlide({ id: auth.user.id, ip: auth.ip }, (await params).id, body.data));
}
