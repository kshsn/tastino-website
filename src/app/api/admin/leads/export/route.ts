import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { parseLeadFilters } from '@/lib/admin/leads-filters';
import { acquireExport, exportLeadsCsv } from '@/lib/admin/leads-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The filtered leads as a CSV download (UTF-8 with a byte order mark). Sales and Super admin only. */
export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'leads');
  if (!auth.ok) return auth.response;
  const { filters, errors } = parseLeadFilters(Object.fromEntries(new URL(req.url).searchParams));
  if (errors.length > 0) return jsonResponse({ error: 'invalid', errors }, 422);

  // A few exports at a time per person: each one reads the database in batches.
  const slot = acquireExport(auth.user.id);
  if (!slot.ok) return jsonResponse({ error: 'rate_limited' }, 429, { 'Retry-After': String(slot.retryAfterSec) });

  const day = new Date().toISOString().slice(0, 10);
  return new Response(exportLeadsCsv(filters, { id: auth.user.id, ip: auth.ip }, new Date(), slot.release), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tastino-leads-${day}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
