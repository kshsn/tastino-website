import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { LeadDetailPanel } from '@/components/admin/LeadDetailPanel';
import { requireAdminPage } from '@/lib/admin/guard';
import { getLead, listAssignees } from '@/lib/admin/leads-service';

export const metadata: Metadata = { title: 'Lead' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminLeadPage({ params }: Props) {
  const { id } = await params;
  const user = await requireAdminPage('leads', `/admin/leads/${id}`);
  const [lead, assignees] = await Promise.all([getLead(id), listAssignees()]);
  if (!lead) notFound();

  return (
    <AdminShell user={user} current="leads" title="Lead" subtitle={lead.reference}>
      <p className="back"><Link href="/admin/leads">← All leads</Link></p>
      <LeadDetailPanel initial={lead} assignees={assignees} />
    </AdminShell>
  );
}
