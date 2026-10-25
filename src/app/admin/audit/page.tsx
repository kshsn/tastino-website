import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { AuditEntries } from '@/components/admin/AuditEntries';
import { AuditFilters } from '@/components/admin/AuditFilters';
import { auditQuery, parseAuditFilters } from '@/lib/admin/audit-filters';
import { auditFacets, listAudit } from '@/lib/admin/audit-service';
import { requireAdminPage } from '@/lib/admin/guard';

export const metadata: Metadata = { title: 'Audit log' };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Super admin only: who did what, to which record, when and from where. Anyone else gets a 403 page. */
export default async function AdminAuditPage({ searchParams }: Props) {
  const query = await searchParams;
  const user = await requireAdminPage('audit', '/admin/audit');
  const { filters, errors } = parseAuditFilters(query);
  const [page, facets] = await Promise.all([listAudit(filters), auditFacets()]);

  const base = auditQuery(filters);
  const link = (n: number) => `/admin/audit?${[base, n > 1 ? `page=${n}` : ''].filter(Boolean).join('&')}`;

  return (
    <AdminShell user={user} current="audit" title="Audit log" subtitle="Every sign-in, change and refused request, newest first. Entries cannot be edited or deleted.">
      <AuditFilters filters={filters} errors={errors} users={facets.users} actions={facets.actions} entityTypes={facets.entityTypes} />
      <section className="adm-card mt-card" aria-label="Entries">
        <div className="adm-bar">
          <p className="note" role="status">
            {page.total === 0 ? 'No entries' : `${page.total} entr${page.total === 1 ? 'y' : 'ies'}`} · page {page.page} of {page.pages}
          </p>
        </div>
        <AuditEntries rows={page.rows} />
        {page.pages > 1 && (
          <nav className="adm-pager" aria-label="Pages">
            {page.page > 1 ? <Link className="btn small" href={link(page.page - 1)}>← Newer</Link> : <span />}
            {page.page < page.pages ? <Link className="btn small" href={link(page.page + 1)}>Older →</Link> : <span />}
          </nav>
        )}
      </section>
    </AdminShell>
  );
}
