import { beforeAll, describe, expect, it } from 'vitest';
import { visibleText } from '@/lib/content/audit';

// US-006.1 / .3 / .6 / .7: crawls the distributors page in both languages against a running build.
const BASE = (process.env.CONTENT_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const pages: Record<string, { status: number; html: string }> = {};

beforeAll(async () => {
  for (const locale of ['en', 'ar']) {
    const res = await fetch(`${BASE}/${locale}/distributors`);
    pages[locale] = { status: res.status, html: await res.text() };
  }
}, 120_000);

describe.each(['en', 'ar'])('distributors page (%s)', (locale) => {
  it('answers 200', () => expect(pages[locale].status).toBe(200));
  it('shows no placeholder phone number', () => expect(visibleText(pages[locale].html)).not.toContain('555'));
  it('shows the real WhatsApp number and email', () => {
    expect(pages[locale].html).toContain('https://wa.me/201100111887');
    expect(pages[locale].html).toContain('info@tastinofoods.com');
  });
  it('hides the honeypot from keyboard and screen readers', () => {
    expect(pages[locale].html).toMatch(/aria-hidden="true"[^>]*class="lf-hp"|class="lf-hp"[^>]*aria-hidden="true"/);
    expect(pages[locale].html).toMatch(/name="website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="website"/);
  });
  it('has no pre-ticked consent box', () => {
    const consent = pages[locale].html.match(/<input[^>]*name="consent"[^>]*>/)?.[0] ?? '';
    expect(consent).not.toMatch(/\bchecked\b/);
  });
  it('loads no external script (no CAPTCHA)', () => {
    const external = [...pages[locale].html.matchAll(/<script[^>]*\ssrc="(https?:)?\/\/[^"]+"/g)].map((m) => m[0]);
    expect(external).toEqual([]);
  });
});

describe('lead endpoint and redirect', () => {
  it('redirects /contact to the distributors page once (301)', async () => {
    const res = await fetch(`${BASE}/en/contact`, { redirect: 'manual' });
    expect([res.status, new URL(res.headers.get('location') ?? '', BASE).pathname]).toEqual([301, '/en/distributors']);
  });
  it('does not answer GET on /api/leads (405)', async () => expect((await fetch(`${BASE}/api/leads`)).status).toBe(405));
});
