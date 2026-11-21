import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { addNote } from '@/lib/admin/leads-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Adds an internal note. There is no way to edit or remove one. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(req, 'leads', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const { id } = await params;

  const result = await addNote({ id: auth.user.id, ip: auth.ip, name: auth.user.name }, id, body.data);
  if (result.status === 'not_found') return jsonResponse({ error: 'not_found' }, 404);
  if (result.status === 'invalid') return jsonResponse({ error: 'invalid', errors: { body: result.error } }, 422);
  return jsonResponse({ note: result.note, duplicate: result.duplicate }, result.duplicate ? 200 : 201);
}
