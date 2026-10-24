import { describe, expect, it } from 'vitest';
import { buildAutoReply, buildNotification, resolveRecipients, type LeadForEmail } from '@/lib/leads/email-content';
import { normalizeEmail, normalizePhone, singleLine, toLatinDigits } from '@/lib/leads/normalize';
import { SlidingWindowLimiter } from '@/lib/leads/rate-limit';
import { formatReference } from '@/lib/leads/service';
import { validateLead } from '@/lib/leads/validate';
import { clientIp, isCrossOrigin } from '@/lib/leads/request';
import { withRetry } from '@/lib/leads/mailer';

const valid = {
  reason: 'distributor',
  name: 'Sara Ali',
  company: 'Ali Trading',
  email: 'Sara@Example.com',
  phoneCode: 'EG',
  phone: '0100 123 4567',
  country: 'EG',
  companyType: 'distribution',
  brands: ['lora', 'tama', 'lora'],
  message: 'We would like to distribute your products.',
  consent: true,
  locale: 'en',
  key: 'abcdef123456',
};

describe('normalize', () => {
  it('converts Arabic-Indic digits', () => expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789'));
  it('removes newlines and control characters from single-line text', () => expect(singleLine('a\r\nb\u0000c')).not.toMatch(/[\r\n\u0000]/));
  it('builds an international phone number', () => expect(normalizePhone('20', '010 0123 4567')).toBe('+201001234567'));
  it('rejects a too short phone number', () => expect(normalizePhone('20', '12')).toBeNull());
  it('lowercases a valid email and rejects a bad one', () => {
    expect(normalizeEmail('Sara@Example.com')).toBe('sara@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('a@b.com\r\nbcc: x@y.com')).toBeNull();
  });
});

describe('validateLead', () => {
  it('accepts a complete distributor request and cleans it', () => {
    const r = validateLead(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe('sara@example.com');
      expect(r.data.phone).toBe('+201001234567');
      expect(r.data.brands).toEqual(['lora', 'tama']);
    }
  });
  it('requires consent', () => {
    const r = validateLead({ ...valid, consent: false });
    expect(r.ok === false && r.errors.consent).toBe('consent');
  });
  it('reports required fields', () => {
    const r = validateLead({ ...valid, name: '  ', message: '' });
    expect(r.ok === false && [r.errors.name, r.errors.message]).toEqual(['required', 'required']);
  });
  it('rejects an over-long message', () => {
    const r = validateLead({ ...valid, message: 'x'.repeat(2001) });
    expect(r.ok === false && r.errors.message).toBe('tooLong');
  });
  it('rejects a bad email', () => {
    const r = validateLead({ ...valid, email: 'nope' });
    expect(r.ok === false && r.errors.email).toBe('email');
  });
  it('rejects a bad phone number', () => {
    const r = validateLead({ ...valid, phone: '12' });
    expect(r.ok === false && r.errors.phone).toBe('phone');
  });
  it('ignores fields that do not apply to the reason and unknown fields', () => {
    const r = validateLead({ ...valid, reason: 'other', isAdmin: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.brands).toEqual([]);
      expect(r.data.companyType).toBeNull();
      expect('isAdmin' in r.data).toBe(false);
    }
  });
  it('rejects an unknown country, reason and key', () => {
    const r = validateLead({ ...valid, country: 'ZZ', reason: 'x', key: 'a' });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(['country', 'key', 'reason']);
  });
  it('does not throw on non-object input', () => {
    for (const v of [null, 5, 'x', [], undefined]) expect(validateLead(v).ok).toBe(false);
  });
});

describe('rate limiter', () => {
  it('allows the limit, refuses the next, then recovers', () => {
    let t = 0;
    const l = new SlidingWindowLimiter(2, 1000, () => t);
    expect(l.hit('a').allowed && l.hit('a').allowed).toBe(true);
    const refused = l.hit('a');
    expect([refused.allowed, refused.retryAfterSec]).toEqual([false, 1]);
    expect(l.hit('b').allowed).toBe(true);
    t = 1001;
    expect(l.hit('a').allowed).toBe(true);
  });
});

describe('reference', () => {
  it('formats TF-year-number', () => expect(formatReference(2026, 142)).toBe('TF-2026-0142'));
});

describe('request helpers', () => {
  it('prefers x-real-ip, else the last forwarded address', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4');
    expect(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 5.5.5.5' }))).toBe('5.5.5.5');
    expect(clientIp(new Headers())).toBe('unknown');
  });
  it('detects a cross-origin browser request', () => {
    expect(isCrossOrigin(new Headers({ origin: 'https://evil.com', host: 'tastinofoods.com' }))).toBe(true);
    expect(isCrossOrigin(new Headers({ origin: 'https://tastinofoods.com', host: 'tastinofoods.com' }))).toBe(false);
    expect(isCrossOrigin(new Headers({ host: 'tastinofoods.com' }))).toBe(false);
  });
});

const lead: LeadForEmail = {
  reference: 'TF-2026-0001',
  reason: 'distributor',
  name: 'Sara',
  email: 'sara@example.com',
  phone: null,
  company: 'Ali\r\nBcc: x@y.com',
  country: 'Egypt',
  companyType: 'distribution',
  brandsOfInterest: ['lora'],
  product: null,
  message: 'Hello',
  locale: 'en',
  consentAt: new Date('2026-10-24T10:00:00Z'),
  consentTextVersion: '2026-10-v1',
  createdAt: new Date('2026-10-24T10:00:00Z'),
};

describe('email content', () => {
  it('only ever sends internal mail to info@tastinofoods.com', () => {
    const r = resolveRecipients(['a@b.com', 'info@tastinofoods.com']);
    expect(r.to).toEqual(['info@tastinofoods.com']);
    expect(r.ignored).toEqual(['a@b.com']);
    expect(resolveRecipients(undefined).to).toEqual(['info@tastinofoods.com']);
  });
  it('sets Reply-To to the visitor and keeps header injection out of the subject', () => {
    const m = buildNotification(lead, ['info@tastinofoods.com']);
    expect(m.replyTo).toBe('sara@example.com');
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.text).toContain('TF-2026-0001');
    expect(m.text).toContain('—');
  });
  const ctx = { responseTime: '', email: 'info@tastinofoods.com', phone: '', whatsapp: '', address: '' };
  it('omits the response-time sentence when none is configured', () => {
    expect(buildAutoReply(lead, ctx).text).not.toMatch(/within/i);
    expect(buildAutoReply(lead, { ...ctx, responseTime: 'within one business day' }).text).toContain('within one business day');
  });
  it('does not repeat anything the visitor typed in the auto-reply', () => {
    const m = buildAutoReply({ ...lead, name: 'Win a prize at http://evil.example' }, ctx);
    expect(m.text).not.toContain('evil.example');
  });
  it('writes the auto-reply in Arabic for Arabic visitors', () => {
    const m = buildAutoReply({ ...lead, locale: 'ar' }, ctx);
    expect(m.to).toEqual(['sara@example.com']);
    expect(m.text).toMatch(/[؀-ۿ]/);
  });
});

describe('withRetry', () => {
  it('retries then succeeds, and reports failure after the last attempt', async () => {
    let n = 0;
    const sleep = async () => {};
    expect(await withRetry(async () => { if (++n < 3) throw new Error('x'); }, { sleep })).toBe(true);
    n = 0;
    expect(await withRetry(async () => { n++; throw new Error('x'); }, { sleep })).toBe(false);
    expect(n).toBe(3);
  });
});
