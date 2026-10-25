'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, signInMessage } from '@/lib/admin/client';

interface InviteFormProps {
  token: string;
  name: string;
  email: string;
  /** The link resets the password of an existing user (instead of setting the first one). */
  reset: boolean;
}

const PROBLEM_TEXT: Record<string, string> = {
  tooShort: 'Use at least 12 characters.',
  tooLong: 'That is too long (the limit is 72 bytes).',
  weak: 'That is too easy to guess. Do not use your email or a repeated character.',
};

/** The page behind an invitation link: choose a password, then go on to set up the authenticator app. */
export function InviteForm({ token, name, email, reset }: InviteFormProps) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (pw !== again) {
      setError('The two passwords are not the same.');
      return;
    }
    setPending(true);
    setError(null);
    const res = await api('/api/admin/auth/invite', 'POST', { token, password: pw });
    if (res.ok) {
      router.replace(typeof res.data.next === 'string' ? res.data.next : '/admin/login');
      return;
    }
    setPending(false);
    if (res.error === 'expired') {
      router.replace(`/admin/invite/${encodeURIComponent(token)}`);
      return;
    }
    const problem = typeof res.data.problem === 'string' ? res.data.problem : '';
    setError(res.error === 'weak_password' ? (PROBLEM_TEXT[problem] ?? 'Choose a stronger password.') : signInMessage(res.error, res.data));
  }

  return (
    <>
      <h1>{reset ? `New password, ${name}` : `Welcome, ${name}`}</h1>
      <p>
        Choose a {reset ? 'new ' : ''}password for <b>{email}</b>. {reset ? 'Next you will enter the code from your authenticator app.' : 'Next you will set up your authenticator app.'}
      </p>
      {error && (
        <div className="alert err" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="adm-new-pw">New password</label>
          <div className="pw">
            <input id="adm-new-pw" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby="adm-new-pw-help" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <span className="note" id="adm-new-pw-help">At least 12 characters. A few random words work well.</span>
        </div>
        <div className="field">
          <label htmlFor="adm-new-pw2">Repeat the password</label>
          <input id="adm-new-pw2" type={show ? 'text' : 'password'} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        <button type="submit" className="btn primary go" disabled={pending || !pw || !again} aria-busy={pending}>
          {pending ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </>
  );
}
