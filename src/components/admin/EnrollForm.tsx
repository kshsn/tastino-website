'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, signInMessage } from '@/lib/admin/client';

interface EnrollFormProps {
  next: string;
}

type Setup = { secret: string; qr: string; email: string };

/**
 * Authenticator set-up: scan the QR code (or type the key), confirm one code, then see the eight recovery codes once.
 * Until the first code is confirmed nothing is switched on, so a failed attempt can simply be repeated.
 */
export function EnrollForm({ next }: EnrollFormProps) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    api<Setup>('/api/admin/auth/enroll').then((res) => {
      if (!live) return;
      if (res.ok) setSetup(res.data);
      else if (res.error === 'expired') router.replace('/admin/login?reason=timeout');
      else setLoadError(signInMessage(res.error, res.data));
    });
    return () => {
      live = false;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setAlert('Enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setPending(true);
    setAlert(null);
    const res = await api<{ recoveryCodes: string[] }>('/api/admin/auth/enroll', 'POST', { code: code.trim() });
    setPending(false);
    if (res.ok) {
      setCodes(res.data.recoveryCodes);
      return;
    }
    if (res.error === 'expired') {
      router.replace('/admin/login?reason=timeout');
      return;
    }
    setAlert(res.error === 'invalid' ? 'That code is not right. Wait for the next code in your app and try again.' : signInMessage(res.error, res.data));
    setCode('');
  }

  if (codes) {
    return (
      <>
        <h1>Save your recovery codes</h1>
        <p>If you lose your phone, each of these codes lets you sign in once. They are shown only now: keep them somewhere safe.</p>
        <div className="codes">
          {codes.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>
        <div className="field">
          <label>
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved these codes
          </label>
        </div>
        <button type="button" className="btn primary go" disabled={!saved} onClick={() => router.replace(next)}>
          Continue to the admin
        </button>
      </>
    );
  }

  return (
    <>
      <h1>Set up two-step verification</h1>
      <p>Scan this code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…), then enter the 6-digit code it shows.</p>
      {loadError && (
        <div className="alert err" role="alert">
          {loadError}
        </div>
      )}
      {!setup && !loadError && <p className="note">Loading…</p>}
      {setup && (
        <>
          <div className="qr">
            {/* a data: image made by the server; next/image cannot optimise it */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt={`QR code to add ${setup.email} to your authenticator app`} width={200} height={200} />
          </div>
          <p className="note">Cannot scan? Enter this key by hand:</p>
          <div className="secret" aria-label="Setup key">{setup.secret}</div>
          {alert && (
            <div className="alert err mt-gap" role="alert">
              {alert}
            </div>
          )}
          <form onSubmit={onSubmit} noValidate className="mt-gap">
            <div className="field">
              <label htmlFor="adm-enroll-code">6-digit code</label>
              <input id="adm-enroll-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
            <button type="submit" className="btn primary go" disabled={pending} aria-busy={pending}>
              {pending ? 'Checking…' : 'Confirm and continue'}
            </button>
          </form>
        </>
      )}
    </>
  );
}
