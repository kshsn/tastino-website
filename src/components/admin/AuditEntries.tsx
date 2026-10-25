import { formatUtc } from '@/lib/admin/format';
import type { AuditRow } from '@/lib/admin/audit-service';

interface AuditEntriesProps {
  rows: AuditRow[];
}

type FieldChange = { before: unknown; after: unknown };

const isChange = (v: unknown): v is FieldChange => !!v && typeof v === 'object' && !Array.isArray(v) && 'before' in v && 'after' in v;

/** A value for display: text as it is (React escapes it), empty as a dash, anything structured as JSON. */
const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;
const MAX_SHOWN = 500;
/** Text that came from outside: no direction-override characters, and capped so one entry cannot swamp the page. */
const clean = (s: string): string => (s.length > MAX_SHOWN ? `${s.slice(0, MAX_SHOWN)}…` : s).replace(BIDI, '');
const show = (v: unknown): string => (v === null || v === undefined || v === '' ? '—' : clean(typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v)));

/** Changed fields side by side (before and after), or the plain facts of an event. */
function Details({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).length === 0) {
    return <p className="note">No further details were recorded.</p>;
  }
  const entries = Object.entries(changes as Record<string, unknown>);
  if (entries.every(([, v]) => isChange(v))) {
    return (
      <table className="adm-diff">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Before</th>
            <th scope="col">After</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([field, v]) => (
            <tr key={field}>
              <th scope="row">{field}</th>
              <td className="was" dir="auto">{show((v as FieldChange).before)}</td>
              <td className="now" dir="auto">{show((v as FieldChange).after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <dl className="adm-facts-list">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd dir="auto">{isChange(v) ? `${show(v.before)} → ${show(v.after)}` : show(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The log as a list: one line per entry, opening to show what changed. Nothing here can edit an entry. */
export function AuditEntries({ rows }: AuditEntriesProps) {
  if (rows.length === 0) {
    return (
      <div className="adm-empty">
        <b>No entries match.</b>
        <span>Try removing a filter or widening the dates.</span>
      </div>
    );
  }
  return (
    <ul className="adm-entries">
      {rows.map((r) => (
        <li key={r.id}>
          <details>
            <summary>
              <span className="when">{formatUtc(r.createdAt)}</span>
              <span className="who-line" dir="auto">{r.actor ? r.actor.name : <i className="muted">Nobody signed in</i>}</span>
              <code className="act">{r.action}</code>
              <span className="what">{r.entityType}{r.entityId ? ` · ${r.entityId}` : ''}</span>
            </summary>
            <div className="entry-body">
              <p className="note">
                {r.actor ? `${r.actor.name} (${r.actor.email})` : 'No signed-in user'} · address {r.ip ?? 'not recorded'} · entry {r.id}
              </p>
              <Details changes={r.changes} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
