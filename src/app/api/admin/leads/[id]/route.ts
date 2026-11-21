import { jsonResponse, readJson, requireAdminApi } from '@/lib/admin/guard';
import { getLead, updateLead } from '@/lib/admin/leads-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'leads');
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const lead = await getLead(id);
  return lead ? jsonResponse({ lead }) : jsonResponse({ error: 'not_found' }, 404);
}

/** Status, assignee, archive and restore. A lead that someone else changed meanwhile answers 409 with the latest state. */
export async function PATCH(req: Request, { params }: Context) {
  const auth = await requireAdminApi(req, 'leads', { mutating: true });
  if (!auth.ok) return auth.response;
  const body = await readJson(req);
  if (!body.ok) return body.response;
  const { id } = await params;

  // A status change must say which status it was made from; otherwise it could silently overwrite a colleague's change.
  const data = body.data as Record<string, unknown> | null;
  if (data && typeof data === 'object' && 'status' in data && !('expectedStatus' in data)) {
    return jsonResponse({ error: 'invalid', errors: { expectedStatus: 'invalid' } }, 422);
  }

  const result = await updateLead({ id: auth.user.id, ip: auth.ip }, id, body.data);
  switch (result.status) {
    case 'ok':
    case 'unchanged':
      return jsonResponse({ lead: result.lead, changed: result.status === 'ok' });
    case 'conflict':
      return jsonResponse({ error: 'conflict', lead: result.lead }, 409);
    case 'not_found':
      return jsonResponse({ error: 'not_found' }, 404);
    default:
      return jsonResponse({ error: 'invalid', errors: result.errors }, 422);
  }
}

/** Leads are archived, never deleted: for every role, including Super admin, a delete request is refused. */
export async function DELETE(req: Request) {
  const auth = await requireAdminApi(req, 'leads', { mutating: true });
  if (!auth.ok) return auth.response;
  return jsonResponse({ error: 'method_not_allowed', hint: 'Archive the lead instead.' }, 405, { Allow: 'GET, PATCH' });
}
