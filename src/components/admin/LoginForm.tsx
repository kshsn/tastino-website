'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, signInMessage } from '@/lib/admin/client';

interface LoginFormProps {
  /** Where to go after the whole sign-in (already checked to be inside the admin). */
  next: string;
  /** Why the visitor is here, when it is not a plain visit. */
  notice: 'timeout' | 'signed-out' | null;
}

type Alert = { kind: 'err' | 'lock' | 'info'; text: string } | null;

const NOTICE_TEXT = {
  timeout: 'You were signed out after 30 minutes without activity. Sign in again to continue.',
  'signed-out': 'You have been signed out.',
} as const;

/** Step 1: email and the account's passphrase. Never says which of the two was wrong. */
export function LoginForm({ next, notice }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<Alert>(notice ? { kind: 'info', text: NOTICE_TEXT[notice] } : null);
  const [errors, setErrors] = useState<{ email?: string; pw?: string }>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    const found: typeof errors = {};
    if (!email.trim()) found.email = 'Enter your email.';
    if (!pw) found.pw = 'Enter your password.';
    setErrors(found);
    if (found.email || found.pw) {
      setAlert(null);
      (found.email ? emailRef : pwRef).current?.focus();
      return;
    }
    setPending(true);
    setAlert(null);
    const res = await api<{ next: 'verify' | 'enroll' }>('/api/admin/auth/login', 'POST', { email, password: pw });
    if (res.ok) {
      router.replace(`/admin/login/${res.data.next}?next=${encodeURIComponent(next)}`);
      return;
    }
    setPending(false);
    setPw('');
    setAlert({ kind: res.error === 'locked' ? 'lock' : 'err', text: signInMessage(res.error, res.data) });
    pwRef.current?.focus();
  }

  return (
    <>
      <h1>Sign in</h1>
      <p>Use your Tastino admin account.</p>
      {alert && (
        <div className={`alert ${alert.kind}`} role="alert">
          {alert.text}
        </div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <div className={`field${errors.email ? ' err' : ''}`}>
          <label htmlFor="adm-email">Email</label>
          <input ref={emailRef} id="adm-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'adm-email-err' : undefined} />
          {errors.email && <span className="msg" id="adm-email-err">{errors.email}</span>}
        </div>
        <div className={`field${errors.pw ? ' err' : ''}`}>
          <label htmlFor="adm-pw">Password</label>
          <div className="pw">
            <input ref={pwRef} id="adm-pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!errors.pw} aria-describedby={errors.pw ? 'adm-pw-err' : undefined} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.pw && <span className="msg" id="adm-pw-err">{errors.pw}</span>}
        </div>
        <button type="submit" className="btn primary go" disabled={pending} aria-busy={pending}>
          {pending ? 'Checking…' : 'Continue'}
        </button>
      </form>
      <div className="links">
        <span className="note">Session ends after 30 min idle</span>
      </div>
    </>
  );
}
