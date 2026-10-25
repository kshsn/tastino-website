import { jsonResponse, requireAdminApi } from '@/lib/admin/guard';
import { retentionSummary } from '@/lib/admin/leads-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How many leads are past the 24-month retention period (Super admin only). Nothing is deleted. */
export async function GET(req: Request) {
  const auth = await requireAdminApi(req, 'retention');
  if (!auth.ok) return auth.response;
  return jsonResponse(await retentionSummary());
}
