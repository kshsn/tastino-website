import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EnrollForm } from '@/components/admin/EnrollForm';
import { SignInFrame } from '@/components/admin/SignInFrame';
import { currentSession } from '@/lib/admin/guard';
import { safeNext } from '@/lib/admin/paths';

export const metadata: Metadata = { title: 'Set up two-step verification' };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminEnrollPage({ searchParams }: Props) {
  const query = await searchParams;
  const raw = query.next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);

  const session = await currentSession();
  if (!session.ok) redirect('/admin/login?reason=timeout');
  if (session.session.stage === 'ACTIVE') redirect(next);
  if (session.session.stage === 'PENDING_VERIFY') redirect(`/admin/login/verify?next=${encodeURIComponent(next)}`);

  return (
    <SignInFrame>
      <EnrollForm next={next} />
    </SignInFrame>
  );
}
