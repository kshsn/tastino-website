'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/admin/client';
import { formatUtc, orNotProvided } from '@/lib/admin/format';
import { LEAD_STATUSES, STATUS_LABEL, reasonLabel } from '@/lib/admin/leads-labels';
import type { AssigneeRef, LeadDetail, NoteView } from '@/lib/admin/leads-service';

interface LeadDetailPanelProps {
  initial: LeadDetail;
  assignees: AssigneeRef[];
}

type Notice = { kind: 'ok' | 'err' | 'info'; text: string } | null;

const ERRORS: Record<string, string> = {
  network: 'Could not reach the server. Nothing was changed; try again.',
  unauthenticated: 'Your session has ended. Sign in again.',
  forbidden: 'You are not allowed to do that.',
  not_found: 'This lead no longer exists.',
};

const NOTE_ERRORS: Record<string, string> = { required: 'Write something first.', tooLong: 'A note can be at most 2,000 characters.' };

/** One lead: every field, status, assignee, archive and the append-only notes. */
export function LeadDetailPanel({ initial, assignees }: LeadDetailPanelProps) {
  const [lead, setLead] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [assigneeId, setAssigneeId] = useState(initial.assignee?.id ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [text, setText] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);

  function apply(next: LeadDetail) {
    setLead(next);
    setStatus(next.status);
    setAssigneeId(next.assignee?.id ?? '');
  }

  async function save(key: string, body: Record<string, unknown>, done: string) {
    if (busy) return;
    setBusy(key);
    setNotice(null);
    const res = await api<{ lead: LeadDetail; changed: boolean }>(`/api/admin/leads/${lead.id}`, 'PATCH', body);
    setBusy(null);
    if (res.ok) {
      apply(res.data.lead);
      setNotice(res.data.changed ? { kind: 'ok', text: done } : { kind: 'info', text: 'Nothing changed.' });
      return;
    }
    if (res.error === 'conflict' && res.data.lead) {
      apply(res.data.lead as LeadDetail);
      setNotice({ kind: 'err', text: 'Someone else changed this lead first. The latest version is shown; check it and try again if you still want to change it.' });
      return;
    }
    // The screen goes back to what the server has saved.
    setStatus(lead.status);
    setAssigneeId(lead.assignee?.id ?? '');
    setNotice({ kind: 'err', text: res.error === 'invalid' ? 'That value is not allowed.' : (ERRORS[res.error] ?? 'Something went wrong. Please try again.') });
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!text.trim()) {
      setNoteError(NOTE_ERRORS.required);
      return;
    }
    setBusy('note');
    setNoteError(null);
    const res = await api<{ note: NoteView }>(`/api/admin/leads/${lead.id}/notes`, 'POST', { body: text });
    setBusy(null);
    if (res.ok) {
      const note = res.data.note;
      setLead((l) => (l.notes.some((n) => n.id === note.id) ? l : { ...l, notes: [...l.notes, note], notesCount: l.notesCount + 1 }));
      setText('');
      return;
    }
    // The typed text stays, so nothing is lost and a retry adds exactly one note.
    const field = (res.data.errors as { body?: string } | undefined)?.body;
    setNoteError(field ? (NOTE_ERRORS[field] ?? 'Could not save the note.') : (ERRORS[res.error] ?? 'Could not save the note. Try again.'));
  }

  const assigneeOptions = lead.assignee && !assignees.some((a) => a.id === lead.assignee!.id) ? [{ id: lead.assignee.id, name: `${lead.assignee.name} (inactive user)`, active: false }, ...assignees] : assignees;
  const field = (label: string, value: string | null | undefined, dir?: 'auto' | 'ltr') => (
    <div className="fact">
      <small>{label}</small>
      <b dir={dir ?? 'auto'}>{orNotProvided(value)}</b>
    </div>
  );

  return (
    <>
      {notice && (
        <div className={`alert ${notice.kind}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="adm-two">
        <section className="adm-card" aria-labelledby="lead-info">
          <h2 id="lead-info">
            <span dir="auto">{lead.name}</span> <span className={`pill st-${lead.status.toLowerCase()}`}>{STATUS_LABEL[lead.status]}</span>
          </h2>
          <p className="note">
            {lead.reference} · received {formatUtc(lead.createdAt)}
            {lead.archived && ' · Archived'}
            {lead.retention && ' · Retention period ended (nothing is deleted automatically)'}
          </p>
          <div className="adm-facts">
            {field('Company', lead.company)}
            {field('Country', lead.country)}
            {field('Email', lead.email, 'ltr')}
            {field('Phone', lead.phone, 'ltr')}
            {field('Reason', reasonLabel(lead.reason))}
            {field('Company type', lead.companyType)}
            {field('Brands of interest', lead.brandsOfInterest.length ? lead.brandsOfInterest.join(', ') : null)}
            {field('Product', lead.product)}
            {field('Language of the form', lead.locale === 'ar' ? 'Arabic' : 'English')}
            {field('Consent given', `${formatUtc(lead.consentAt)} (wording ${lead.consentTextVersion})`)}
            {field('Notification email', lead.emailStatus.toLowerCase())}
            {field('Auto-reply to the visitor', lead.autoReplyStatus.toLowerCase())}
          </div>
          <h3>Message</h3>
          <p className="adm-message" dir="auto">{lead.message}</p>
        </section>

        <aside className="adm-stack">
          <section className="adm-card" aria-labelledby="lead-manage">
            <h2 id="lead-manage">Manage</h2>
            <div className="field">
              <label htmlFor="lead-status">Status</label>
              <div className="inline">
                <select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={!!busy}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
                <button type="button" className="btn small primary" disabled={!!busy || status === lead.status} onClick={() => save('status', { status, expectedStatus: lead.status }, `Status is now ${STATUS_LABEL[status]}.`)}>
                  {busy === 'status' ? 'Saving…' : 'Save status'}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="lead-assignee">Assigned to</label>
              <div className="inline">
                <select id="lead-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!!busy}>
                  <option value="">Not assigned</option>
                  {assigneeOptions.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button type="button" className="btn small" disabled={!!busy || assigneeId === (lead.assignee?.id ?? '')} onClick={() => save('assignee', { assigneeId: assigneeId || null }, assigneeId ? 'Lead assigned.' : 'Lead is no longer assigned.')}>
                  {busy === 'assignee' ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
            <div className="field">
              <span className="label">Archive</span>
              <button type="button" className="btn small" disabled={!!busy} onClick={() => save('archive', { archived: !lead.archived }, lead.archived ? 'Lead restored to the inbox.' : 'Lead archived. It is kept and can be restored.')}>
                {busy === 'archive' ? 'Saving…' : lead.archived ? 'Restore to inbox' : 'Archive lead'}
              </button>
              <span className="note">Leads are never deleted.</span>
            </div>
          </section>

          <section className="adm-card" aria-labelledby="lead-notes">
            <h2 id="lead-notes">Notes ({lead.notes.length})</h2>
            {lead.notes.length === 0 ? (
              <p className="note">No notes yet.</p>
            ) : (
              <ol className="adm-notes">
                {lead.notes.map((n) => (
                  <li key={n.id}>
                    <p dir="auto">{n.body}</p>
                    <small>{n.author} · {formatUtc(n.createdAt)}</small>
                  </li>
                ))}
              </ol>
            )}
            <form onSubmit={addNote} noValidate>
              <div className={`field${noteError ? ' err' : ''}`}>
                <label htmlFor="lead-note">Add a note (it cannot be edited or removed)</label>
                <textarea id="lead-note" rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} dir="auto" aria-invalid={!!noteError} />
                {noteError && <span className="msg">{noteError}</span>}
                <span className="note">{text.length} / 2000</span>
              </div>
              <button type="submit" className="btn small primary" disabled={!!busy} aria-busy={busy === 'note'}>
                {busy === 'note' ? 'Adding…' : 'Add note'}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
