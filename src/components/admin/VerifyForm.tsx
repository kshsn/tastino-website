'use client';

import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, signInMessage } from '@/lib/admin/client';

interface VerifyFormProps {
  email: string;
  next: string;
}

/** Step 2: the 6-digit code from the authenticator app, or (second tab of the same form) one recovery code. */
export function VerifyForm({ email, next }: VerifyFormProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<{ kind: 'err' | 'lock'; text: string } | null>(null);
  const [shake, setShake] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const recoveryRef = useRef<HTMLInputElement>(null);

  async function submit(body: { code?: string; recoveryCode?: string }) {
    if (pending) return;
    setPending(true);
    setAlert(null);
    const res = await api('/api/admin/auth/verify', 'POST', body);
    if (res.ok) {
      router.replace(next);
      return;
    }
    setPending(false);
    if (res.error === 'expired') {
      router.replace('/admin/login?reason=timeout');
      return;
    }
    const text = res.error === 'invalid' ? (recovery ? 'That recovery code is not valid or was already used.' : 'That code is not valid or has expired. Try the latest code.') : signInMessage(res.error, res.data);
    setAlert({ kind: res.error === 'locked' ? 'lock' : 'err', text });
    if (recovery) {
      recoveryRef.current?.focus();
    } else {
      setDigits(Array(6).fill(''));
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      boxes.current[0]?.focus();
    }
  }

  /**
   * One box changed. Usually one digit was typed; but a phone can fill the whole code into the first box, and a
   * digit typed over an existing one arrives as two characters. All of those are handled here.
   */
  function setDigit(index: number, raw: string) {
    let chars = raw.replace(/\D/g, '');
    const previous = digits[index];
    if (previous && chars.length === 2 && chars.includes(previous)) chars = chars.replace(previous, '');
    const next6 = [...digits];
    if (!chars) {
      next6[index] = '';
      setDigits(next6);
      return;
    }
    const start = chars.length >= 6 ? 0 : index;
    for (let k = 0; k < chars.length && start + k < 6; k++) next6[start + k] = chars[k];
    setDigits(next6);
    boxes.current[Math.min(start + chars.length, 5)]?.focus();
    if (next6.every(Boolean)) void submit({ code: next6.join('') });
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length !== 6) return;
    e.preventDefault();
    setDigits(text.split(''));
    void submit({ code: text });
  }

  function onRecoverySubmit(e: FormEvent) {
    e.preventDefault();
    if (!recoveryCode.trim()) {
      setAlert({ kind: 'err', text: 'Enter one of your recovery codes.' });
      return;
    }
    void submit({ recoveryCode });
  }

  return (
    <>
      <h1>Two-step verification</h1>
      <p>
        {recovery ? 'Enter one of your recovery codes. Each one works once.' : <>Enter the 6-digit code from your authenticator app for <b>{email}</b>.</>}
      </p>
      {alert && (
        <div className={`alert ${alert.kind}`} role="alert">
          {alert.text}
        </div>
      )}
      {recovery ? (
        <form onSubmit={onRecoverySubmit} noValidate>
          <div className="field">
            <label htmlFor="adm-recovery">Recovery code</label>
            <input ref={recoveryRef} id="adm-recovery" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXXX-XXXXX-XXXXX" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} />
          </div>
          <button type="submit" className="btn primary go" disabled={pending} aria-busy={pending}>
            {pending ? 'Checking…' : 'Use recovery code'}
          </button>
        </form>
      ) : (
        <>
          <div className={`otp${shake ? ' shake' : ''}`} role="group" aria-label="6-digit code">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`Digit ${i + 1}`}
                disabled={pending}
                autoFocus={i === 0}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
              />
            ))}
          </div>
          <button type="button" className="btn primary go" disabled={pending || digits.some((d) => !d)} aria-busy={pending} onClick={() => void submit({ code: digits.join('') })}>
            {pending ? 'Checking…' : 'Verify and sign in'}
          </button>
        </>
      )}
      <div className="links">
        <Link href="/admin/login">← Back</Link>
        <button type="button" onClick={() => { setRecovery((r) => !r); setAlert(null); }}>
          {recovery ? 'Use the app code' : 'Use a recovery code'}
        </button>
      </div>
    </>
  );
}
