import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { recipientLimiter, requestLimiter, submissionLimiter } from '@/lib/leads/rate-limit';
import { deliverLeadEmails, retryPendingEmails, submitLead } from '@/lib/leads/service';
import type { EmailTransport } from '@/lib/leads/mailer';
import type { OutgoingEmail } from '@/lib/leads/email-content';
import { runSeed } from '../../prisma/seed/run';

beforeAll(async () => {
  await runSeed(db);
}, 120_000);
afterAll(() => db.$disconnect());

let counter = 0;
const payload = (over: Record<string, unknown> = {}) => ({
  reason: 'distributor',
  name: 'Sara Ali',
  company: 'Ali Trading',
  email: `sara${++counter}@example.com`,
  phoneCode: 'EG',
  phone: '01001234567',
  country: 'EG',
  companyType: 'distribution',
  brands: ['lora'],
  message: `Message number ${counter}`,
  consent: true,
  locale: 'en',
  key: `key-${counter}-${Math.random().toString(36).slice(2, 10)}`,
  ...over,
});
const ctx = (ip = `10.0.0.${++counter % 250}`) => ({ ip });

beforeEach(async () => {
  // The limiters live in memory; start each test with fresh counters.
  (requestLimiter as unknown as { hits: Map<string, number[]> }).hits.clear();
  (submissionLimiter as unknown as { hits: Map<string, number[]> }).hits.clear();
  (recipientLimiter as unknown as { hits: Map<string, number[]> }).hits.clear();
});

function fakeTransport(fail = false) {
  const sent: OutgoingEmail[] = [];
  const transport: EmailTransport = {
    async send(m) {
      if (fail) throw new Error('smtp down');
      sent.push(m);
    },
  };
  return { sent, transport };
}
const noWait = { attempts: 2, delaysMs: [0], sleep: async () => {} };

describe('submitLead', () => {
  it('stores a valid lead with a TF-year-number reference and consent proof', async () => {
    const r = await submitLead(payload(), ctx());
    expect(r.status).toBe('created');
    if (r.status !== 'created') return;
    expect(r.reference).toMatch(/^TF-\d{4}-\d{4,}$/);
    const lead = await db.lead.findUniqueOrThrow({ where: { id: r.leadId } });
    expect([lead.reason, lead.country, lead.consentTextVersion, lead.phone]).toEqual(['DISTRIBUTOR', 'Egypt', '2026-10-v1', '+201001234567']);
    expect(lead.consentAt).toBeInstanceOf(Date);
  });

  it('gives different references to different leads', async () => {
    const a = await submitLead(payload(), ctx());
    const b = await submitLead(payload(), ctx());
    expect(a.status === 'created' && b.status === 'created' && a.reference !== b.reference).toBe(true);
  });

  it('returns the first lead when the same submission key arrives again', async () => {
    const p = payload();
    const a = await submitLead(p, ctx());
    const b = await submitLead(p, ctx());
    expect([b.status, b.status === 'duplicate' && a.status === 'created' && b.reference === a.reference]).toEqual(['duplicate', true]);
  });

  it('treats the same email and message within minutes as a duplicate', async () => {
    const p = payload();
    await submitLead(p, ctx());
    const again = await submitLead({ ...p, key: 'another-key-12345' }, ctx());
    expect(again.status).toBe('duplicate');
  });

  it('saves nothing and answers "spam" when the hidden field is filled', async () => {
    const before = await db.lead.count();
    const r = await submitLead({ ...payload(), website: 'http://spam.example' }, ctx());
    expect([r.status, await db.lead.count()]).toEqual(['spam', before]);
  });

  it('rejects an invalid submission with field errors and saves nothing', async () => {
    const before = await db.lead.count();
    const r = await submitLead(payload({ email: 'bad', consent: false }), ctx());
    expect(r.status).toBe('invalid');
    if (r.status === 'invalid') expect([r.errors.email, r.errors.consent]).toEqual(['email', 'consent']);
    expect(await db.lead.count()).toBe(before);
  });

  it('refuses the sixth accepted submission from one address within 10 minutes', async () => {
    const same = { ip: '203.0.113.9' };
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await submitLead(payload(), same)).status);
    expect(results).toEqual(['created', 'created', 'created', 'created', 'created', 'rate_limited']);
  });

  it('accepts at most 3 requests per email address per day, even from different addresses', async () => {
    const email = 'one-person@example.com';
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await submitLead(payload({ email }), { ip: `198.51.100.${i + 1}` })).status);
    expect(results).toEqual(['created', 'created', 'created', 'rate_limited']);
  });

  it('does not store fields that do not belong to the reason', async () => {
    const r = await submitLead(payload({ reason: 'other', brands: ['lora'], companyType: 'horeca' }), ctx());
    expect(r.status).toBe('created');
    if (r.status !== 'created') return;
    const lead = await db.lead.findUniqueOrThrow({ where: { id: r.leadId } });
    expect([lead.brandsOfInterest, lead.companyType]).toEqual([[], null]);
  });
});

describe('deliverLeadEmails', () => {
  async function newLead() {
    const r = await submitLead(payload(), ctx());
    if (r.status !== 'created') throw new Error('lead not created');
    return r.leadId;
  }

  it('sends the notification to info@ only, then the auto-reply to the visitor', async () => {
    const id = await newLead();
    const { sent, transport } = fakeTransport();
    const r = await deliverLeadEmails(id, { transport, retry: noWait });
    expect(r).toEqual({ notification: 'SENT', autoReply: 'SENT' });
    expect(sent.map((m) => m.to)).toEqual([['info@tastinofoods.com'], [expect.stringContaining('@example.com')]]);
  });

  it('keeps the lead and marks both emails FAILED when the mail server is down', async () => {
    const id = await newLead();
    const r = await deliverLeadEmails(id, { transport: fakeTransport(true).transport, retry: noWait });
    expect(r).toEqual({ notification: 'FAILED', autoReply: 'FAILED' });
    expect(await db.lead.findUnique({ where: { id } })).not.toBeNull();
  });

  it('does not send again what was already sent', async () => {
    const id = await newLead();
    const first = fakeTransport();
    await deliverLeadEmails(id, { transport: first.transport, retry: noWait });
    const second = fakeTransport();
    await deliverLeadEmails(id, { transport: second.transport, retry: noWait });
    expect(second.sent).toEqual([]);
  });

  it('sends only the failed auto-reply on a later run', async () => {
    const id = await newLead();
    await db.lead.update({ where: { id }, data: { emailStatus: 'SENT' } });
    const { sent, transport } = fakeTransport();
    await deliverLeadEmails(id, { transport, retry: noWait });
    expect(sent).toHaveLength(1);
  });

  it('leaves both PENDING when email is not configured', async () => {
    const id = await newLead();
    expect(await deliverLeadEmails(id, { transport: null })).toEqual({ notification: 'PENDING', autoReply: 'PENDING' });
  });

  it('ignores a recipient list that names anyone but info@tastinofoods.com', async () => {
    await db.setting.upsert({ where: { key: 'leads.recipients' }, create: { key: 'leads.recipients', value: ['x@evil.com'] }, update: { value: ['x@evil.com'] } });
    const id = await newLead();
    const { sent, transport } = fakeTransport();
    await deliverLeadEmails(id, { transport, retry: noWait });
    expect(sent[0].to).toEqual(['info@tastinofoods.com']);
  });

  it('retryPendingEmails delivers leads that were waiting', async () => {
    await db.lead.updateMany({ data: { emailStatus: 'SENT', autoReplyStatus: 'SENT' } });
    const id = await newLead();
    const { transport } = fakeTransport();
    const r = await retryPendingEmails({ transport, retry: noWait });
    expect(r).toEqual({ checked: 1, sent: 1 });
    expect((await db.lead.findUniqueOrThrow({ where: { id } })).autoReplyStatus).toBe('SENT');
  });
});
