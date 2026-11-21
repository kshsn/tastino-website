import { auditFacets, listAudit } from '@/lib/admin/audit-service';
import { parseAuditFilters } from '@/lib/admin/audit-filters';
import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The audit log (Super admin only). Read only: there is no way to edit or delete an entry. */
export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'audit');
  if (!auth.ok) return auth.response;
  const { filters, errors } = parseAuditFilters(Object.fromEntries(new URL(req.url).searchParams));
  if (errors.length > 0) return jsonResponse({ error: 'invalid', errors }, 422);
  const [page, facets] = await Promise.all([listAudit(filters), auditFacets()]);
  return jsonResponse({ ...page, facets });
}
