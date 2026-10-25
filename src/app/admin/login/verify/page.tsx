import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInFrame } from '@/components/admin/SignInFrame';
import { VerifyForm } from '@/components/admin/VerifyForm';
import { currentSession } from '@/lib/admin/guard';
import { safeNext } from '@/lib/admin/paths';

export const metadata: Metadata = { title: 'Two-step verification' };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminVerifyPage({ searchParams }: Props) {
  const query = await searchParams;
  const raw = query.next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw);

  const session = await currentSession();
  if (!session.ok) redirect('/admin/login?reason=timeout');
  if (session.session.stage === 'ACTIVE') redirect(next);
  if (session.session.stage === 'PENDING_ENROLL') redirect(`/admin/login/enroll?next=${encodeURIComponent(next)}`);

  return (
    <SignInFrame>
      <VerifyForm email={session.user.email} next={next} />
    </SignInFrame>
  );
}
