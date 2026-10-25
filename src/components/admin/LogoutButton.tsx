'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin/client';

/** Ends the session on the server first; the page only changes once the server has confirmed it. */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const res = await api('/api/admin/auth/logout', 'POST');
    if (res.ok) {
      router.replace('/admin/login?reason=signed-out');
      router.refresh();
      return;
    }
    setPending(false);
    setFailed(true);
  }

  return (
    <>
      <button type="button" onClick={signOut} disabled={pending} aria-busy={pending}>
        {pending ? 'Signing out…' : failed ? 'Could not sign out: try again' : 'Sign out'}
      </button>
    </>
  );
}
