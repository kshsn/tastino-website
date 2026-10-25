import Link from 'next/link';
import { formatUtc } from '@/lib/admin/format';
import { STATUS_LABEL, reasonLabel } from '@/lib/admin/leads-labels';
import type { LeadRow } from '@/lib/admin/leads-service';

interface LeadsTableProps {
  rows: LeadRow[];
}

/** The inbox rows. Names and companies are shown as plain text (React escapes them); Arabic reads right-to-left. */
export function LeadsTable({ rows }: LeadsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="adm-empty">
        <b>No leads match.</b>
        <span>Try removing a filter, or check back when new requests arrive.</span>
      </div>
    );
  }
  return (
    <div className="adm-scroll">
      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">Lead</th>
            <th scope="col">Country</th>
            <th scope="col">Reason</th>
            <th scope="col">Status</th>
            <th scope="col">Assigned to</th>
            <th scope="col">Received</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="who">
                <Link href={`/admin/leads/${r.id}`}>
                  <b dir="auto">{r.name}</b>
                </Link>
                <span dir="auto">{r.company}</span>
                {r.archived && <span className="tag">Archived</span>}
                {r.retention && <span className="tag warn">Retention period ended</span>}
              </td>
              <td dir="auto">{r.country}</td>
              <td>{reasonLabel(r.reason)}</td>
              <td><span className={`pill st-${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span></td>
              <td>{r.assignee ? (r.assignee.active ? r.assignee.name : `${r.assignee.name} (inactive)`) : <span className="muted">Not assigned</span>}</td>
              <td className="nowrap">{formatUtc(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
