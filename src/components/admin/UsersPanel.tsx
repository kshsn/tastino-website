'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/admin/client';
import { ROLE_LABEL, ROLES } from '@/lib/admin/permissions';
import type { UserRow, UserStatus } from '@/lib/admin/users-service';

interface UsersPanelProps {
  initial: UserRow[];
  /** The signed-in Super admin: their own row cannot be deactivated from here by mistake. */
  meId: string;
}

const STATUS_LABEL: Record<UserStatus, string> = { active: 'Active', invite_pending: 'Invite pending', locked: 'Locked', deactivated: 'Deactivated' };

const FIELD_TEXT: Record<string, string> = {
  required: 'This is required.',
  email: 'Enter a valid email address.',
  tooLong: 'That is too long.',
  invalid: 'Choose one of the options.',
};

const ACTION_ERROR: Record<string, string> = {
  last_super_admin: 'There must always be at least one active Super admin. Make someone else a Super admin first.',
  not_found: 'That user no longer exists. Reload the page.',
  not_pending: 'This user is deactivated. Reactivate them first.',
  forbidden: 'You are not allowed to do that.',
  unauthenticated: 'Your session has ended. Sign in again.',
  network: 'Could not reach the server. Check your connection and try again.',
};

type Notice = { kind: 'ok' | 'err' | 'info'; text: string; link?: string } | null;

/** Staff accounts: invite, change role, deactivate, unlock, reset two-step, resend an invitation. */
export function UsersPanel({ initial, meId }: UsersPanelProps) {
  const [users, setUsers] = useState(initial);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('SALES');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const replace = (row: UserRow) => setUsers((list) => list.map((u) => (u.id === row.id ? row : u)));

  function describe(error: string): string {
    return ACTION_ERROR[error] ?? 'Something went wrong. Please try again.';
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setNotice(null);
    setErrors({});
    const res = await api<{ user: UserRow; delivery: string; inviteLink?: string }>('/api/admin/users', 'POST', { name, email, role });
    setCreating(false);
    if (res.ok) {
      setUsers((list) => [...list, res.data.user]);
      setName('');
      setEmail('');
      setNotice(
        res.data.delivery === 'sent'
          ? { kind: 'ok', text: `Invitation sent to ${res.data.user.email}. The link works once and expires in 48 hours.` }
          : { kind: 'info', text: `${res.data.user.name} was created, but the email could not be sent. Give them this link yourself (it works once and expires in 48 hours):`, link: res.data.inviteLink },
      );
      return;
    }
    if (res.error === 'duplicate') setErrors({ email: 'A user with this email already exists.' });
    else if (res.error === 'invalid') {
      const fields = (res.data.errors ?? {}) as Record<string, string>;
      setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, FIELD_TEXT[v] ?? FIELD_TEXT.invalid])));
    } else setNotice({ kind: 'err', text: describe(res.error) });
  }

  async function run(key: string, path: string, method: 'POST' | 'PATCH', body: unknown, done: (data: Record<string, unknown>) => Notice) {
    if (busy) return;
    setBusy(key);
    setNotice(null);
    const res = await api<{ user?: UserRow }>(path, method, body);
    setBusy(null);
    if (!res.ok) {
      setNotice({ kind: 'err', text: describe(res.error) });
      return;
    }
    if (res.data.user) replace(res.data.user);
    setNotice(done(res.data as Record<string, unknown>));
  }

  const patch = (u: UserRow, change: Record<string, unknown>, text: string) => run(`${u.id}:patch`, `/api/admin/users/${u.id}`, 'PATCH', change, () => ({ kind: 'ok', text }));

  return (
    <>
      {notice && (
        <div className={`alert ${notice.kind}`} role="status">
          {notice.text}
          {notice.link && <div className="adm-link">{notice.link}</div>}
        </div>
      )}

      <section className="adm-card" aria-labelledby="adm-new-user">
        <h2 id="adm-new-user">Invite a new user</h2>
        <p className="note">They get an email with a single-use link to choose a password and set up two-step verification.</p>
        <form onSubmit={onCreate} noValidate className="adm-form">
          <div className={`field${errors.name ? ' err' : ''}`}>
            <label htmlFor="u-name">Full name</label>
            <input id="u-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" aria-invalid={!!errors.name} />
            {errors.name && <span className="msg">{errors.name}</span>}
          </div>
          <div className={`field${errors.email ? ' err' : ''}`}>
            <label htmlFor="u-email">Email</label>
            <input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={!!errors.email} />
            {errors.email && <span className="msg">{errors.email}</span>}
          </div>
          <div className={`field${errors.role ? ' err' : ''}`}>
            <label htmlFor="u-role">Role</label>
            <select id="u-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
            {errors.role && <span className="msg">{errors.role}</span>}
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="u-send">Send invitation</label>
            <button id="u-send" type="submit" className="btn primary mt-label" disabled={creating} aria-busy={creating}>
              {creating ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </form>
      </section>

      <section className="adm-card mt-card" aria-labelledby="adm-all-users">
        <h2 id="adm-all-users">All users ({users.length})</h2>
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Two-step</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const mine = u.id === meId;
                const working = busy?.startsWith(u.id);
                return (
                  <tr key={u.id}>
                    <td className="who">
                      <b>{u.name}{mine && ' (you)'}</b>
                      <span>{u.email}</span>
                    </td>
                    <td>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Role of {u.name}</label>
                      <select id={`role-${u.id}`} value={u.role} disabled={!!working} onChange={(e) => patch(u, { role: e.target.value }, `${u.name} is now ${ROLE_LABEL[e.target.value as keyof typeof ROLE_LABEL]}. Their sessions were ended.`)}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td><span className={`pill ${u.status}`}>{STATUS_LABEL[u.status]}</span></td>
                    <td>{u.twoFactor ? 'On' : 'Not set up'}</td>
                    <td>
                      <div className="row-actions">
                        {u.status === 'locked' && (
                          <button type="button" className="btn small" disabled={!!working} onClick={() => run(`${u.id}:unlock`, `/api/admin/users/${u.id}/unlock`, 'POST', undefined, () => ({ kind: 'ok', text: `${u.name} can sign in again.` }))}>Unlock</button>
                        )}
                        {u.status === 'invite_pending' && (
                          <button type="button" className="btn small" disabled={!!working} onClick={() => run(`${u.id}:resend`, `/api/admin/users/${u.id}/resend-invite`, 'POST', undefined, (d) => (d.delivery === 'sent' ? { kind: 'ok', text: `A new invitation was sent to ${u.email}. The old link no longer works.` } : { kind: 'info', text: `The email could not be sent. Give ${u.name} this new link (the old one no longer works):`, link: typeof d.inviteLink === 'string' ? d.inviteLink : undefined }))}>Resend invite</button>
                        )}
                        {(u.status === 'active' || u.status === 'locked') && (
                          <button type="button" className="btn small" disabled={!!working} onClick={() => { if (window.confirm(`Send ${u.name} a link to choose a new password? Their current password keeps working until they use it.`)) void run(`${u.id}:pwreset`, `/api/admin/users/${u.id}/resend-invite`, 'POST', undefined, (d) => (d.delivery === 'sent' ? { kind: 'ok', text: `A password reset link was sent to ${u.email}.` } : { kind: 'info', text: `The email could not be sent. Give ${u.name} this link (it works once and expires in 48 hours):`, link: typeof d.inviteLink === 'string' ? d.inviteLink : undefined })); }}>Reset password</button>
                        )}
                        {u.twoFactor && (
                          <button type="button" className="btn small" disabled={!!working} onClick={() => { if (window.confirm(`Reset two-step verification for ${u.name}? They will be signed out and must set it up again.`)) void run(`${u.id}:reset`, `/api/admin/users/${u.id}/reset-2fa`, 'POST', undefined, () => ({ kind: 'ok', text: `Two-step verification was reset for ${u.name}.` })); }}>Reset 2FA</button>
                        )}
                        {u.status !== 'deactivated' ? (
                          <button type="button" className="btn small danger" disabled={!!working || mine} title={mine ? 'You cannot deactivate your own account here' : undefined} onClick={() => { if (window.confirm(`Deactivate ${u.name}? They are signed out at once and cannot sign in.`)) void patch(u, { active: false }, `${u.name} was deactivated.`); }}>Deactivate</button>
                        ) : (
                          <button type="button" className="btn small" disabled={!!working} onClick={() => patch(u, { active: true }, `${u.name} is active again.`)}>Reactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
