/** A moment as `2026-10-25 14:30 UTC`: the same text for everyone, whatever their computer's time zone. */
export function formatUtc(iso: string | Date | null | undefined): string {
  if (!iso) return 'Not provided';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return 'Not provided';
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

/** An optional value for display: empty or missing values read "Not provided", never blank or "null". */
export const orNotProvided = (v: string | null | undefined): string => (v && v.trim() ? v : 'Not provided');
