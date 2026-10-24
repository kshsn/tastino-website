import type { ErrorCode, LeadField } from './validate';

export type SendResult =
  | { kind: 'ok'; reference: string }
  | { kind: 'invalid'; errors: Partial<Record<LeadField, ErrorCode>> }
  | { kind: 'rate_limited' }
  | { kind: 'unavailable' }
  | { kind: 'network' };

/** Sends the form to the lead endpoint and sorts the answer into the cases the form reacts to. Browser only. */
export async function sendLead(body: unknown): Promise<SendResult> {
  try {
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 201 || res.status === 200) {
      const data = (await res.json().catch(() => ({}))) as { reference?: string };
      return data.reference ? { kind: 'ok', reference: data.reference } : { kind: 'unavailable' };
    }
    if (res.status === 422) {
      const data = (await res.json().catch(() => ({}))) as { errors?: Partial<Record<LeadField, ErrorCode>> };
      return { kind: 'invalid', errors: data.errors ?? {} };
    }
    return res.status === 429 ? { kind: 'rate_limited' } : { kind: 'unavailable' };
  } catch {
    return { kind: 'network' };
  }
}
