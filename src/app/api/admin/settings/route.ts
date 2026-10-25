import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { getEditableSettings, saveSettings } from '@/lib/admin/settings-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'settings');
  if (!auth.ok) return auth.response;
  return jsonResponse({ settings: await getEditableSettings() });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminApi(req, 'settings', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req, 20_000);
  if (!body.ok) return body.response;
  const r = await saveSettings({ id: auth.user.id, ip: auth.ip }, body.data);
  return r.status === 'ok' ? jsonResponse(r) : jsonResponse({ error: 'invalid', errors: r.errors }, 422);
}
