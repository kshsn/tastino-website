import type { Metadata } from 'next';
import Link from 'next/link';
import { InviteForm } from '@/components/admin/InviteForm';
import { SignInFrame } from '@/components/admin/SignInFrame';
import { inspectInvite } from '@/lib/admin/users-service';

export const metadata: Metadata = { title: 'Accept your invitation', robots: { index: false, follow: false } };

interface Props {
  params: Promise<{ token: string }>;
}

/** The link in the invitation email. A used, expired or made-up link shows the same "expired" message and gives no access. */
export default async function AdminInvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await inspectInvite(token);

  return (
    <SignInFrame>
      {invite.status === 'valid' ? (
        <InviteForm token={token} name={invite.name} email={invite.email} reset={invite.reset} />
      ) : (
        <>
          <h1>This link has expired</h1>
          <p>These links work once and last 48 hours. Ask a Super admin to send you a new one, or sign in if you already have an account.</p>
          <Link className="btn primary go" href="/admin/login">
            Go to sign in
          </Link>
        </>
      )}
    </SignInFrame>
  );
}
