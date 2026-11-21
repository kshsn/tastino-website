import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminPage } from '@/lib/admin/guard';
import { can } from '@/lib/admin/permissions';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function AdminHomePage() {
  const user = await requireAdminPage('dashboard', '/admin');
  const first = user.name.split(' ')[0];

  return (
    <AdminShell user={user} current="dashboard" title={`Welcome, ${first}`} subtitle="Here is what your role can do in the admin.">
      <div className="adm-cards">
        {can(user.role, 'users') && (
          <Link className="adm-card" href="/admin/users">
            <h2>Users</h2>
            <p>Invite staff, change roles, unlock accounts and reset two-step verification.</p>
          </Link>
        )}
        {can(user.role, 'content') && (
          <div className="adm-card">
            <h2>Brands &amp; products</h2>
            <p>Edit brands, products, images and page copy. Coming in the next release.</p>
          </div>
        )}
        {can(user.role, 'leads') && (
          <Link className="adm-card" href="/admin/leads">
            <h2>Leads</h2>
            <p>See and follow up distributor, catalogue and product requests: status, assignee, notes, archive and CSV export.</p>
          </Link>
        )}
        {can(user.role, 'audit') && (
          <Link className="adm-card" href="/admin/audit">
            <h2>Audit log</h2>
            <p>Who signed in, what changed and who was refused, with before and after values. Entries cannot be edited.</p>
          </Link>
        )}
      </div>
    </AdminShell>
  );
}
