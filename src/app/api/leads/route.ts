import { after, NextResponse } from 'next/server';
import { clientIp, isCrossOrigin, MAX_BODY_BYTES } from '@/lib/leads/request';
import { deliverLeadEmails, formatReference, submitLead } from '@/lib/leads/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/** Public lead form endpoint. POST only (any other method gets 405). Never returns lead data, only a reference number. */
export async function POST(req: Request) {
  if (isCrossOrigin(req.headers)) return json({ error: 'forbidden' }, 403);

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);
  if (!text.trim()) return json({ error: 'empty_body' }, 400);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const result = await submitLead(body, { ip: clientIp(req.headers) });
  switch (result.status) {
    case 'created': {
      // Emails go out after the response, so the visitor never waits for (or is blocked by) the mail server.
      const job = () => deliverLeadEmails(result.leadId).catch((e) => console.error('Lead email job failed:', e instanceof Error ? e.message : e));
      try {
        after(job);
      } catch {
        void job();
      }
      return json({ reference: result.reference }, 201);
    }
    case 'duplicate':
      return json({ reference: result.reference }, 200);
    case 'spam':
      // Answered like a success so a bot learns nothing; nothing is stored or sent.
      return json({ reference: formatReference(new Date().getUTCFullYear(), Math.floor(1000 + Math.random() * 9000)) }, 201);
    case 'invalid':
      return json({ error: 'invalid', errors: result.errors }, 422);
    case 'rate_limited':
      return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(result.retryAfterSec) });
    default:
      return json({ error: 'unavailable' }, 503);
  }
}
