import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { requireAdminPage } from '@/lib/admin/guard';
import { listUsers } from '@/lib/admin/users-service';

export const metadata: Metadata = { title: 'Users' };

/** Super admin only: anyone else gets a 403 page. */
export default async function AdminUsersPage() {
  const user = await requireAdminPage('users', '/admin/users');
  const users = await listUsers();

  return (
    <AdminShell user={user} current="users" title="Users" subtitle="Staff accounts, their roles and sign-in status.">
      <UsersPanel initial={users} meId={user.id} />
    </AdminShell>
  );
}
