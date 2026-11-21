import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { LeadFilters } from '@/components/admin/LeadFilters';
import { LeadsTable } from '@/components/admin/LeadsTable';
import { requireAdminPage } from '@/lib/admin/guard';
import { filtersToQuery, parseLeadFilters } from '@/lib/admin/leads-filters';
import { listAssignees, listLeads } from '@/lib/admin/leads-service';

export const metadata: Metadata = { title: 'Leads' };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The lead inbox: Sales and Super admin only (anyone else gets a 403 page). */
export default async function AdminLeadsPage({ searchParams }: Props) {
  const query = await searchParams;
  const user = await requireAdminPage('leads', '/admin/leads');
  const { filters, errors } = parseLeadFilters(query);
  const [page, assignees] = await Promise.all([listLeads(filters), listAssignees()]);

  const base = filtersToQuery(filters);
  const link = (n: number) => `/admin/leads?${[base, n > 1 ? `page=${n}` : ''].filter(Boolean).join('&')}`;
  const exportHref = `/api/admin/leads/export${base ? `?${base}` : ''}`;

  return (
    <AdminShell user={user} current="leads" title="Leads" subtitle="Distributor, catalogue and product requests from the website.">
      <LeadFilters filters={filters} errors={errors} assignees={assignees} />
      <section className="adm-card mt-card" aria-label="Results">
        <div className="adm-bar">
          <p className="note" role="status">
            {page.total === 0 ? 'No leads' : `${page.total} lead${page.total === 1 ? '' : 's'}`} · page {page.page} of {page.pages}
          </p>
          {page.total > 0 ? (
            <a className="btn small" href={exportHref} download>Export CSV</a>
          ) : (
            <span className="note">No leads to export</span>
          )}
        </div>
        <LeadsTable rows={page.rows} />
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
