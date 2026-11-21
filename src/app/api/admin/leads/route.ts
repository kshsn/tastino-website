import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { parseLeadFilters } from '@/lib/admin/leads-filters';
import { listLeads } from '@/lib/admin/leads-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The lead inbox (Sales and Super admin): filtered, newest first, 25 per page. Nothing here can delete a lead. */
export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'leads');
  if (!auth.ok) return auth.response;
  const { filters, errors } = parseLeadFilters(Object.fromEntries(new URL(req.url).searchParams));
  if (errors.length > 0) return jsonResponse({ error: 'invalid', errors }, 422);
  return jsonResponse(await listLeads(filters));
}
