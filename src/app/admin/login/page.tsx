import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { SignInFrame } from '@/components/admin/SignInFrame';
import { currentSession } from '@/lib/admin/guard';
import { safeNext } from '@/lib/admin/paths';

export const metadata: Metadata = { title: 'Sign in' };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminLoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const next = safeNext(first(query.next));
  const reason = first(query.reason);

  // Already signed in: straight to where they were going.
  const session = await currentSession();
  if (session.ok && session.session.stage === 'ACTIVE') redirect(next);

  const notice = reason === 'timeout' || reason === 'signed-out' ? reason : session.ok ? null : session.reason === 'expired' ? 'timeout' : null;
  return (
    <SignInFrame>
      <LoginForm next={next} notice={notice} />
    </SignInFrame>
  );
}
