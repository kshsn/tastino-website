import Link from 'next/link';
import type { AuditFilterError, AuditFilters as Filters } from '@/lib/admin/audit-filters';

const ERROR_TEXT: Record<AuditFilterError, string> = {
  range: 'The end date is before the start date, so the dates were ignored.',
  date: 'A date is not valid (use the date picker), so it was ignored.',
};

interface AuditFiltersProps {
  filters: Filters;
  errors: AuditFilterError[];
  users: { id: string; name: string }[];
  actions: string[];
  entityTypes: string[];
}

const day = (d: Date | undefined) => (d ? d.toISOString().slice(0, 10) : '');

/** Filters as a plain GET form (works without scripts, and every result has an address). */
export function AuditFilters({ filters, errors, users, actions, entityTypes }: AuditFiltersProps) {
  return (
    <section className="adm-card" aria-label="Filters">
      {errors.length > 0 && (
        <div className="alert err" role="alert">
          {errors.map((e) => (
            <div key={e}>{ERROR_TEXT[e]}</div>
          ))}
        </div>
      )}
      <form method="get" className="adm-filters">
        <div className="field">
          <label htmlFor="a-user">User</label>
          <select id="a-user" name="user" defaultValue={filters.actorId ?? ''}>
            <option value="">Anyone</option>
            <option value="none">Nobody signed in</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a-action">Action</label>
          <select id="a-action" name="action" defaultValue={filters.action ?? ''}>
            <option value="">Any</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a-entity">Record type</label>
          <select id="a-entity" name="entity" defaultValue={filters.entityType ?? ''}>
            <option value="">Any</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a-from">From</label>
          <input id="a-from" type="date" name="from" defaultValue={day(filters.from)} />
        </div>
        <div className="field">
          <label htmlFor="a-to">Until</label>
          <input id="a-to" type="date" name="to" defaultValue={day(filters.to)} />
        </div>
        <div className="row-actions end">
          <button type="submit" className="btn primary">Apply filters</button>
          <Link className="btn" href="/admin/audit">Clear</Link>
        </div>
      </form>
    </section>
  );
}
