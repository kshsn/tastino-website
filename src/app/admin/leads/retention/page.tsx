import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/admin/guard';
import { formatUtc } from '@/lib/admin/format';
import { retentionSummary } from '@/lib/admin/leads-service';

export const metadata: Metadata = { title: 'Lead retention' };

/** Super admin only: how many leads are past the 24-month retention period. Nothing is deleted automatically. */
export default async function AdminRetentionPage() {
  const user = await requireAdminPage('retention', '/admin/leads/retention');
  const summary = await retentionSummary();
  const query = 'retention=1&archived=all';

  return (
    <AdminShell user={user} current="retention" title="Lead retention" subtitle="Leads are kept for 24 months. This screen shows which ones are past that, so the decision is made on purpose.">
      <section className="adm-card" aria-labelledby="ret-count">
        <h2 id="ret-count">{summary.count} lead{summary.count === 1 ? '' : 's'} past 24 months</h2>
        {summary.count === 0 ? (
          <p className="note">None yet: every lead is within the retention period.</p>
        ) : (
          <p className="note">Received before {formatUtc(summary.cutoff)}. The oldest was received {formatUtc(summary.oldest)}. Archived leads are included.</p>
        )}
        <div className="row-actions">
          <Link className="btn" href={`/admin/leads?${query}`}>View these leads</Link>
          {summary.count > 0 && (
            <a className="btn primary" href={`/api/admin/leads/export?${query}`} download>Export them to CSV</a>
          )}
        </div>
        <p className="note">Nothing is deleted automatically. The leads stay in the database until the owner decides what to do with them.</p>
      </section>
    </AdminShell>
  );
}
