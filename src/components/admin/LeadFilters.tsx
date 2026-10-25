import Link from 'next/link';
import { COUNTRIES } from '@/lib/leads/options';
import type { FilterError, LeadFilters as Filters } from '@/lib/admin/leads-filters';
import { LEAD_REASONS, LEAD_STATUSES, STATUS_LABEL, reasonLabel } from '@/lib/admin/leads-labels';
import type { AssigneeRef } from '@/lib/admin/leads-service';

const ERROR_TEXT: Record<FilterError, string> = {
  range: 'The end date is before the start date, so the dates were ignored.',
  date: 'A date is not valid (use the date picker), so it was ignored.',
  status: 'That status does not exist, so it was ignored.',
  reason: 'That reason does not exist, so it was ignored.',
};

interface LeadFiltersProps {
  filters: Filters;
  errors: FilterError[];
  assignees: AssigneeRef[];
}

const day = (d: Date | undefined) => (d ? d.toISOString().slice(0, 10) : '');

/** Search and filters as a plain GET form: it works without scripts and every result has a shareable address. */
export function LeadFilters({ filters, errors, assignees }: LeadFiltersProps) {
  return (
    <section className="adm-card" aria-label="Search and filters">
      {errors.length > 0 && (
        <div className="alert err" role="alert">
          {errors.map((e) => (
            <div key={e}>{ERROR_TEXT[e]}</div>
          ))}
        </div>
      )}
      <form method="get" className="adm-filters">
        <div className="field wide">
          <label htmlFor="f-q">Search name, email, company or reference</label>
          <input id="f-q" name="q" defaultValue={filters.q ?? ''} maxLength={100} dir="auto" />
        </div>
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={filters.status ?? ''}>
            <option value="">Any</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-reason">Reason</label>
          <select id="f-reason" name="reason" defaultValue={filters.reason ?? ''}>
            <option value="">Any</option>
            {LEAD_REASONS.map((r) => (
              <option key={r} value={r}>{reasonLabel(r)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-country">Country</label>
          <select id="f-country" name="country" defaultValue={filters.country ?? ''}>
            <option value="">Any</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.en}>{c.en}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-assignee">Assigned to</label>
          <select id="f-assignee" name="assignee" defaultValue={filters.assigneeId ?? ''}>
            <option value="">Anyone</option>
            <option value="none">Not assigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-archived">Show</label>
          <select id="f-archived" name="archived" defaultValue={filters.archived}>
            <option value="no">Inbox (not archived)</option>
            <option value="only">Archived only</option>
            <option value="all">Everything</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-from">Received from</label>
          <input id="f-from" type="date" name="from" defaultValue={day(filters.from)} />
        </div>
        <div className="field">
          <label htmlFor="f-to">Received until</label>
          <input id="f-to" type="date" name="to" defaultValue={day(filters.to)} />
        </div>
        <div className="field check">
          <label>
            <input type="checkbox" name="retention" value="1" defaultChecked={!!filters.pastRetention} /> Past 24 months
          </label>
        </div>
        <div className="row-actions end">
          <button type="submit" className="btn primary">Apply filters</button>
          <Link className="btn" href="/admin/leads">Clear</Link>
        </div>
      </form>
    </section>
  );
}
