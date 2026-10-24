import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { requestLimiter, submissionLimiter } from '@/lib/leads/rate-limit';
import { runSeed } from '../../prisma/seed/run';

// `after()` only works inside a Next request; run the job inline here (email stays PENDING: no SMTP in tests).
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (f: () => unknown) => void f() }));

const route = await import('@/app/api/leads/route');

beforeAll(async () => {
  await runSeed(db);
}, 120_000);
afterAll(() => db.$disconnect());
beforeEach(() => {
  (requestLimiter as unknown as { hits: Map<string, number[]> }).hits.clear();
  (submissionLimiter as unknown as { hits: Map<string, number[]> }).hits.clear();
});

const body = (over: Record<string, unknown> = {}) => ({
  reason: 'other', name: 'Sara', company: 'Co', email: `r${Math.random().toString(36).slice(2)}@example.com`, country: 'EG',
  message: 'Hello there', consent: true, locale: 'en', key: `k-${Math.random().toString(36).slice(2, 12)}`, ...over,
});
const post = (b: unknown, headers: Record<string, string> = {}, raw?: string) =>
  route.POST(new Request('http://localhost:3000/api/leads', { method: 'POST', headers: { host: 'localhost:3000', 'content-type': 'application/json', ...headers }, body: raw ?? JSON.stringify(b) }));

describe('POST /api/leads', () => {
  it('returns 201 and a reference for a valid request', async () => {
    const res = await post(body());
    expect([res.status, (await res.json()).reference]).toEqual([201, expect.stringMatching(/^TF-/)]);
  });
  it('returns 400 for an empty body', async () => expect((await post(null, {}, '')).status).toBe(400));
  it('returns 400 for non-JSON', async () => expect((await post(null, {}, 'not json')).status).toBe(400));
  it('returns 413 for an oversized body', async () => expect((await post(null, {}, JSON.stringify({ message: 'x'.repeat(30_000) }))).status).toBe(413));
  it('returns 422 with field errors for invalid input', async () => {
    const res = await post(body({ email: 'bad' }));
    expect([res.status, (await res.json()).errors.email]).toEqual([422, 'email']);
  });
  it('returns 403 for a request from another website', async () => expect((await post(body(), { origin: 'https://evil.example' })).status).toBe(403));
  it('has no GET handler (405 by the framework)', () => expect('GET' in route).toBe(false));
  it('never caches', async () => expect((await post(body())).headers.get('cache-control')).toBe('no-store'));
});
