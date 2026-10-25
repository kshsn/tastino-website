import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { parseLeadFilters, subtractMonths } from '@/lib/admin/leads-filters';
import { acquireExport, addNote, exportLeadsCsv, exportLimiter, getLead, listAssignees, listLeads, retentionSummary, updateLead } from '@/lib/admin/leads-service';
import { GET as getLeads } from '@/app/api/admin/leads/route';
import { DELETE as deleteLead, GET as getOne, PATCH as patchLead } from '@/app/api/admin/leads/[id]/route';
import { POST as postNote } from '@/app/api/admin/leads/[id]/notes/route';
import { GET as getExport } from '@/app/api/admin/leads/export/route';
import { GET as getRetention } from '@/app/api/admin/leads/retention/route';
import { makeLead, makeUser, minutes, params, request, resetLimiters, signedIn } from './admin-helpers';

afterAll(() => db.$disconnect());
beforeEach(() => resetLimiters());

let tag = 0;
/** A country name no other test uses, so every list and export in a test only sees its own leads. */
const newCountry = () => `Testland-${Date.now().toString(36)}-${++tag}`;
const filtersFor = (country: string, extra: Record<string, string> = {}) => parseLeadFilters({ country, archived: 'all', ...extra }).filters;
const as = async (role: Role) => {
  const { user } = await makeUser({ role, enrolled: true });
  return { user, ...(await signedIn(user)) };
};
const actorOf = (u: { id: string }) => ({ id: u.id, ip: '198.51.100.20' });
// ignoreBOM keeps the byte order mark in the text, so the tests can see it.
const readAll = async (stream: ReadableStream<Uint8Array>) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(await new Response(stream).arrayBuffer()));

describe('lead inbox (US-009.1)', () => {
  it('lists leads newest first, 25 per page, with the page count', async () => {
    const country = newCountry();
    const base = Date.now();
    await db.lead.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({
        reference: `TF-L-${country}-${i}`,
        reason: 'OTHER' as const,
        name: `Name ${i}`,
        email: `l${i}-${tag}@example.test`,
        company: 'Co',
        country,
        message: 'hello',
        locale: 'en',
        consent: true,
        consentAt: new Date(),
        consentTextVersion: 'v1',
        createdAt: new Date(base - i * 1000),
      })),
    });
    const first = await listLeads(filtersFor(country));
    const second = await listLeads(filtersFor(country, { page: '2' }));
    expect([first.rows.length, second.rows.length, first.total, first.pages, first.rows[0].name, second.rows.at(-1)?.name]).toEqual([25, 5, 30, 2, 'Name 0', 'Name 29']);
  });

  it('shows name, company, country, reason, status, assignee and received date', async () => {
    const country = newCountry();
    const seller = await makeUser({ role: 'SALES', enrolled: true });
    await makeLead({ country, assigneeId: seller.user.id, status: 'IN_CONTACT', reason: 'CATALOGUE' });
    const [row] = (await listLeads(filtersFor(country))).rows;
    expect([row.country, row.reason, row.status, row.assignee?.name, typeof row.createdAt, typeof row.company]).toEqual([country, 'CATALOGUE', 'IN_CONTACT', seller.user.name, 'string', 'string']);
  });

  it('filters by status, reason, country, assignee, archive state and date range', async () => {
    const country = newCountry();
    const seller = await makeUser({ role: 'SALES', enrolled: true });
    const t = Date.UTC(2026, 5, 10, 12);
    const a = await makeLead({ country, status: 'NEW', reason: 'DISTRIBUTOR', createdAt: new Date(t) });
    const b = await makeLead({ country, status: 'CLOSED', reason: 'PRODUCT', assigneeId: seller.user.id, createdAt: new Date(t + 86_400_000 * 5) });
    const c = await makeLead({ country, status: 'NEW', reason: 'OTHER', archived: true, archivedAt: new Date(), createdAt: new Date(t + 86_400_000 * 20) });
    const ids = async (extra: Record<string, string>, archived = 'no') => (await listLeads(parseLeadFilters({ country, archived, ...extra }).filters)).rows.map((r) => r.id).sort();
    expect(await ids({ status: 'NEW' })).toEqual([a.id]);
    expect(await ids({ status: 'CLOSED' })).toEqual([b.id]);
    expect(await ids({ reason: 'PRODUCT' })).toEqual([b.id]);
    expect(await ids({ assignee: seller.user.id })).toEqual([b.id]);
    expect(await ids({ assignee: 'none' })).toEqual([a.id]);
    expect(await ids({}, 'no')).toEqual([a.id, b.id].sort());
    expect(await ids({}, 'only')).toEqual([c.id]);
    expect(await ids({}, 'all')).toEqual([a.id, b.id, c.id].sort());
    expect(await ids({ from: '2026-06-12', to: '2026-06-20' }, 'all')).toEqual([b.id]);
    expect(await ids({ from: '2026-06-10', to: '2026-06-10' }, 'all')).toEqual([a.id]);
  });

  it('searches name, email and company, including Arabic, without treating % or _ as wildcards', async () => {
    const country = newCountry();
    const arabic = await makeLead({ country, name: 'أحمد حسن', company: 'شركة النور للتوزيع' });
    const byMail = await makeLead({ country, email: `Special.Buyer-${tag}@Example.test` });
    await makeLead({ country, company: 'Plain Co' });
    const find = async (q: string) => (await listLeads(filtersFor(country, { q }))).rows.map((r) => r.id);
    expect([await find('النور'), await find('أحمد'), await find(`special.buyer-${tag}`), await find('%'), await find('_')]).toEqual([[arabic.id], [arabic.id], [byMail.id], [], []]);
  });

  it('shows an empty list (not an error) when nothing matches', async () => {
    const page = await listLeads(filtersFor(newCountry()));
    expect([page.rows, page.total, page.pages, page.page]).toEqual([[], 0, 1, 1]);
  });

  it('shows every submitted field in the detail, with optional ones as null', async () => {
    const country = newCountry();
    const lead = await makeLead({ country, phone: '+201001234567', companyType: 'wholesaler', brandsOfInterest: ['lora', 'tama'], product: 'Mango Nectar', locale: 'ar', city: null });
    const d = (await getLead(lead.id))!;
    expect([d.email, d.phone, d.companyType, d.brandsOfInterest, d.product, d.locale, d.consentTextVersion, typeof d.consentAt, d.city, d.notes]).toEqual([lead.email, '+201001234567', 'wholesaler', ['lora', 'tama'], 'Mango Nectar', 'ar', '2026-10-v1', 'string', null, []]);
  });

  it('returns a script in a message as plain data (the screen escapes it)', async () => {
    const lead = await makeLead({ country: newCountry(), message: '<script>alert(1)</script>' });
    expect((await getLead(lead.id))!.message).toBe('<script>alert(1)</script>');
  });

  it('answers 404 for an unknown lead', async () => {
    const { cookie } = await as('SALES');
    expect((await getOne(request('/api/admin/leads/nope', { cookie }), params('nope'))).status).toBe(404);
  });

  it('answers 422 for a wrong filter value', async () => {
    const { cookie } = await as('SALES');
    expect((await getLeads(request('/api/admin/leads?status=DONE', { cookie }))).status).toBe(422);
    expect((await getLeads(request('/api/admin/leads?from=2026-05-02&to=2026-05-01', { cookie }))).status).toBe(422);
  });
});

describe('who may use the leads area (US-009.1)', () => {
  it('lets Sales and Super admin in, keeps Content editor out with 403, and anonymous with 401', async () => {
    const lead = await makeLead({ country: newCountry() });
    const results: Record<string, number[]> = {};
    for (const role of ['SALES', 'SUPER_ADMIN', 'CONTENT_EDITOR'] as const) {
      const { cookie } = await as(role);
      results[role] = [
        (await getLeads(request('/api/admin/leads', { cookie }))).status,
        (await getOne(request(`/api/admin/leads/${lead.id}`, { cookie }), params(lead.id))).status,
        (await getExport(request('/api/admin/leads/export', { cookie }))).status,
        (await patchLead(request(`/api/admin/leads/${lead.id}`, { method: 'PATCH', cookie, body: { archived: false } }), params(lead.id))).status,
        (await postNote(request(`/api/admin/leads/${lead.id}/notes`, { method: 'POST', cookie, body: { body: 'x' } }), params(lead.id))).status,
      ];
    }
    const anon = [(await getLeads(request('/api/admin/leads'))).status, (await getExport(request('/api/admin/leads/export'))).status];
    expect([results.SALES, results.SUPER_ADMIN, results.CONTENT_EDITOR, anon]).toEqual([[200, 200, 200, 200, 201], [200, 200, 200, 200, 201], [403, 403, 403, 403, 403], [401, 401]]);
  });

  it('returns no lead data in a 403 or 401 answer', async () => {
    const lead = await makeLead({ country: newCountry(), name: 'Secret Buyer' });
    const { cookie } = await as('CONTENT_EDITOR');
    const forbidden = await (await getOne(request(`/api/admin/leads/${lead.id}`, { cookie }), params(lead.id))).text();
    const anonymous = await (await getOne(request(`/api/admin/leads/${lead.id}`), params(lead.id))).text();
    expect([forbidden.includes('Secret Buyer'), anonymous.includes('Secret Buyer')]).toEqual([false, false]);
  });
});

describe('lead status (US-009.2)', () => {
  it('starts every new lead as New', async () => {
    expect((await makeLead({ country: newCountry() })).status).toBe('NEW');
  });

  it('changes the status and records old and new in the audit log', async () => {
    const { user } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    const r = await updateLead(actorOf(user), lead.id, { status: 'IN_CONTACT' });
    const entry = await db.auditLog.findFirst({ where: { action: 'lead.status_change', entityId: lead.id } });
    expect([r.status, r.status === 'ok' && r.lead.status, entry?.actorId, entry?.changes]).toEqual(['ok', 'IN_CONTACT', user.id, { status: { before: 'NEW', after: 'IN_CONTACT' } }]);
  });

  it('allows setting a Closed lead back to In contact, and logs it', async () => {
    const { user } = await as('SALES');
    const lead = await makeLead({ country: newCountry(), status: 'CLOSED' });
    const r = await updateLead(actorOf(user), lead.id, { status: 'IN_CONTACT' });
    expect([r.status, await db.auditLog.count({ where: { action: 'lead.status_change', entityId: lead.id } })]).toEqual(['ok', 1]);
  });

  it('refuses a status outside the four with 422 (including an empty one)', async () => {
    const { cookie } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    const send = async (status: unknown) => (await patchLead(request(`/api/admin/leads/${lead.id}`, { method: 'PATCH', cookie, body: { status } }), params(lead.id))).status;
    expect([await send('WON'), await send(''), await send(null), await send(3)]).toEqual([422, 422, 422, 422]);
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe('NEW');
  });

  it('answers 422 through the API when a status change does not say which status it started from', async () => {
    const { cookie } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    const without = await patchLead(request(`/api/admin/leads/${lead.id}`, { method: 'PATCH', cookie, body: { status: 'CLOSED' } }), params(lead.id));
    const withIt = await patchLead(request(`/api/admin/leads/${lead.id}`, { method: 'PATCH', cookie, body: { status: 'CLOSED', expectedStatus: 'NEW' } }), params(lead.id));
    expect([without.status, withIt.status, (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).status]).toEqual([422, 200, 'CLOSED']);
  });

  it('changes and logs nothing when the same status is chosen again', async () => {
    const { user } = await as('SALES');
    const lead = await makeLead({ country: newCountry(), status: 'QUALIFIED' });
    const r = await updateLead(actorOf(user), lead.id, { status: 'QUALIFIED' });
    expect([r.status, await db.auditLog.count({ where: { entityId: lead.id } })]).toEqual(['unchanged', 0]);
  });

  it('warns instead of overwriting when someone else changed the lead first', async () => {
    const { user: one } = await as('SALES');
    const { user: two } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    await updateLead(actorOf(one), lead.id, { status: 'IN_CONTACT', expectedStatus: 'NEW' });
    const late = await updateLead(actorOf(two), lead.id, { status: 'CLOSED', expectedStatus: 'NEW' });
    expect([late.status, late.status === 'conflict' && late.lead.status, (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).status]).toEqual(['conflict', 'IN_CONTACT', 'IN_CONTACT']);
  });

  it('answers 409 with the latest lead through the API on a conflict', async () => {
    const { cookie } = await as('SALES');
    const lead = await makeLead({ country: newCountry(), status: 'QUALIFIED' });
    const res = await patchLead(request(`/api/admin/leads/${lead.id}`, { method: 'PATCH', cookie, body: { status: 'CLOSED', expectedStatus: 'NEW' } }), params(lead.id));
    const body = await res.json();
    expect([res.status, body.lead.status]).toEqual([409, 'QUALIFIED']);
  });

  it('lets only one of two simultaneous changes win', async () => {
    const { user } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    const results = await Promise.all([updateLead(actorOf(user), lead.id, { status: 'IN_CONTACT', expectedStatus: 'NEW' }), updateLead(actorOf(user), lead.id, { status: 'CLOSED', expectedStatus: 'NEW' })]);
    expect(results.map((r) => r.status).sort()).toEqual(['conflict', 'ok']);
  });
});

describe('assignment and notes (US-009.3)', () => {
  it('assigns a lead to an active Sales or Super admin user and can clear it', async () => {
    const { user } = await as('SUPER_ADMIN');
    const seller = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    const set = await updateLead(actorOf(user), lead.id, { assigneeId: seller.user.id });
    const cleared = await updateLead(actorOf(user), lead.id, { assigneeId: null });
    expect([set.status === 'ok' && set.lead.assignee?.name, cleared.status === 'ok' && cleared.lead.assignee]).toEqual([seller.user.name, null]);
    expect(await db.auditLog.count({ where: { action: 'lead.assign', entityId: lead.id } })).toBe(2);
  });

  it('refuses an assignee who is a Content editor, deactivated or unknown, with 422', async () => {
    const { user } = await as('SUPER_ADMIN');
    const editor = await makeUser({ role: 'CONTENT_EDITOR', enrolled: true });
    const gone = await makeUser({ role: 'SALES', enrolled: true, active: false });
    const lead = await makeLead({ country: newCountry() });
    const out = await Promise.all([editor.user.id, gone.user.id, 'no-such-user'].map((id) => updateLead(actorOf(user), lead.id, { assigneeId: id })));
    expect(out.map((r) => r.status)).toEqual(['invalid', 'invalid', 'invalid']);
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).assigneeId).toBeNull();
  });

  it('offers only active Sales and Super admin users as assignees', async () => {
    const editor = await makeUser({ role: 'CONTENT_EDITOR', enrolled: true });
    const seller = await makeUser({ role: 'SALES', enrolled: true });
    const gone = await makeUser({ role: 'SALES', enrolled: true, active: false });
    const ids = (await listAssignees()).map((a) => a.id);
    expect([ids.includes(seller.user.id), ids.includes(editor.user.id), ids.includes(gone.user.id)]).toEqual([true, false, false]);
  });

  it('shows a deactivated assignee as inactive, and lets the lead be reassigned', async () => {
    const { user } = await as('SUPER_ADMIN');
    const gone = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry(), assigneeId: gone.user.id });
    await db.user.update({ where: { id: gone.user.id }, data: { active: false } });
    const seller = await makeUser({ role: 'SALES', enrolled: true });
    expect((await getLead(lead.id))!.assignee?.active).toBe(false);
    const r = await updateLead(actorOf(user), lead.id, { assigneeId: seller.user.id });
    expect(r.status === 'ok' && r.lead.assignee?.id).toBe(seller.user.id);
  });

  it('stores a note with its author and time, oldest first', async () => {
    const one = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    const t0 = new Date();
    await addNote({ ...actorOf(one.user), name: one.user.name }, lead.id, { body: 'first call done' }, t0);
    await addNote({ ...actorOf(one.user), name: one.user.name }, lead.id, { body: 'sent the catalogue' }, minutes(t0, 5));
    const notes = (await getLead(lead.id))!.notes;
    expect([notes.map((n) => n.body), notes[0].author]).toEqual([['first call done', 'sent the catalogue'], one.user.name]);
  });

  it('rejects an empty or too long note, and keeps HTML as plain text', async () => {
    const one = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    const actor = { ...actorOf(one.user), name: one.user.name };
    const empty = await addNote(actor, lead.id, { body: '   \n ' });
    const missing = await addNote(actor, lead.id, {});
    const long = await addNote(actor, lead.id, { body: 'x'.repeat(2001) });
    const max = await addNote(actor, lead.id, { body: 'y'.repeat(2000) });
    const html = await addNote(actor, lead.id, { body: '<b onclick="x()">bold</b>' });
    expect([empty.status === 'invalid' && empty.error, missing.status === 'invalid' && missing.error, long.status === 'invalid' && long.error, max.status, html.status]).toEqual(['required', 'required', 'tooLong', 'ok', 'ok']);
    expect((await getLead(lead.id))!.notes.map((n) => n.body)).toContain('<b onclick="x()">bold</b>');
  });

  it('adds exactly one note when the same text is sent twice (double click or retry)', async () => {
    const one = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    const actor = { ...actorOf(one.user), name: one.user.name };
    const results = await Promise.all([addNote(actor, lead.id, { body: 'called, no answer' }), addNote(actor, lead.id, { body: 'called, no answer' })]);
    const count = await db.leadNote.count({ where: { leadId: lead.id } });
    const again = await addNote(actor, lead.id, { body: 'called, no answer' });
    expect([results.every((r) => r.status === 'ok'), count, again.status === 'ok' && again.duplicate]).toEqual([true, 1, true]);
    expect(await db.leadNote.count({ where: { leadId: lead.id } })).toBe(1);
  });

  it('writes an audit entry for a note without copying the note text into the log', async () => {
    const one = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    await addNote({ ...actorOf(one.user), name: one.user.name }, lead.id, { body: 'private details about the buyer' });
    const entry = await db.auditLog.findFirst({ where: { action: 'lead.note', entityId: lead.id } });
    expect([entry?.actorId, JSON.stringify(entry?.changes).includes('private details')]).toEqual([one.user.id, false]);
  });

  it('refuses to change or delete a note, even straight in the database', async () => {
    const one = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    const r = await addNote({ ...actorOf(one.user), name: one.user.name }, lead.id, { body: 'keep me' });
    if (r.status !== 'ok') throw new Error(r.status);
    await expect(db.leadNote.update({ where: { id: r.note.id }, data: { body: 'edited' } })).rejects.toThrow();
    await expect(db.leadNote.delete({ where: { id: r.note.id } })).rejects.toThrow();
    expect((await db.leadNote.findUniqueOrThrow({ where: { id: r.note.id } })).body).toBe('keep me');
  });

  it('lets the database clear a note author (a foreign key action) but still refuses to change the text', async () => {
    const one = await makeUser({ role: 'SALES', enrolled: true });
    const lead = await makeLead({ country: newCountry() });
    const r = await addNote({ ...actorOf(one.user), name: one.user.name }, lead.id, { body: 'authored note' });
    if (r.status !== 'ok') throw new Error(r.status);
    await db.$executeRaw`UPDATE "LeadNote" SET "authorId" = NULL WHERE "id" = ${r.note.id}`;
    const cleared = await db.leadNote.findUniqueOrThrow({ where: { id: r.note.id } });
    await expect(db.$executeRaw`UPDATE "LeadNote" SET "body" = 'changed' WHERE "id" = ${r.note.id}`).rejects.toThrow();
    expect([cleared.authorId, cleared.body]).toEqual([null, 'authored note']);
    expect((await getLead(lead.id))!.notes[0].author).toBe('Former user');
  });

  it('through the API: 201 for a note, 422 for an empty one, 404 for an unknown lead', async () => {
    const { cookie } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    const ok = await postNote(request(`/api/admin/leads/${lead.id}/notes`, { method: 'POST', cookie, body: { body: 'hello' } }), params(lead.id));
    const empty = await postNote(request(`/api/admin/leads/${lead.id}/notes`, { method: 'POST', cookie, body: { body: ' ' } }), params(lead.id));
    const missing = await postNote(request('/api/admin/leads/nope/notes', { method: 'POST', cookie, body: { body: 'x' } }), params('nope'));
    expect([ok.status, empty.status, missing.status]).toEqual([201, 422, 404]);
  });
});

describe('archive and restore, never delete (US-009.4)', () => {
  it('archives a lead out of the default inbox but keeps it under Archived, then restores it with everything intact', async () => {
    const { user } = await as('SALES');
    const seller = await makeUser({ role: 'SALES', enrolled: true });
    const country = newCountry();
    const lead = await makeLead({ country, status: 'QUALIFIED', assigneeId: seller.user.id });
    await addNote({ ...actorOf(user), name: user.name }, lead.id, { body: 'a note' });
    const archived = await updateLead(actorOf(user), lead.id, { archived: true });
    const inbox = (await listLeads(parseLeadFilters({ country }).filters)).rows.map((r) => r.id);
    const only = (await listLeads(parseLeadFilters({ country, archived: 'only' }).filters)).rows.map((r) => r.id);
    const restored = await updateLead(actorOf(user), lead.id, { archived: false });
    const back = (await getLead(lead.id))!;
    expect([archived.status, inbox, only, restored.status, back.archived, back.status, back.assignee?.id, back.notes.length]).toEqual(['ok', [], [lead.id], 'ok', false, 'QUALIFIED', seller.user.id, 1]);
    expect([await db.auditLog.count({ where: { action: 'lead.archive', entityId: lead.id } }), await db.auditLog.count({ where: { action: 'lead.restore', entityId: lead.id } })]).toEqual([1, 1]);
  });

  it('records one change and one audit entry when archive is sent twice', async () => {
    const { user } = await as('SALES');
    const lead = await makeLead({ country: newCountry() });
    const a = await updateLead(actorOf(user), lead.id, { archived: true });
    const b = await updateLead(actorOf(user), lead.id, { archived: true });
    expect([a.status, b.status, await db.auditLog.count({ where: { action: 'lead.archive', entityId: lead.id } })]).toEqual(['ok', 'unchanged', 1]);
  });

  it('refuses a delete request from any role with 405 and removes nothing', async () => {
    const lead = await makeLead({ country: newCountry() });
    for (const role of ['SALES', 'SUPER_ADMIN'] as const) {
      const { cookie } = await as(role);
      const res = await deleteLead(request(`/api/admin/leads/${lead.id}`, { method: 'DELETE', cookie }));
      expect(res.status).toBe(405);
    }
    expect(await db.lead.count({ where: { id: lead.id } })).toBe(1);
  });

  it('cannot be deleted even straight in the database', async () => {
    const lead = await makeLead({ country: newCountry() });
    await expect(db.lead.delete({ where: { id: lead.id } })).rejects.toThrow();
    await expect(db.$executeRaw`DELETE FROM "Lead" WHERE "id" = ${lead.id}`).rejects.toThrow();
    expect(await db.lead.count({ where: { id: lead.id } })).toBe(1);
  });

  it('answers 404 for an unknown lead and keeps a later submission from the same email as a separate lead', async () => {
    const { user } = await as('SALES');
    expect((await updateLead(actorOf(user), 'no-such-lead', { archived: true })).status).toBe('not_found');
    const country = newCountry();
    const email = `repeat-${tag}@example.test`;
    const first = await makeLead({ country, email });
    await updateLead(actorOf(user), first.id, { archived: true });
    const second = await makeLead({ country, email });
    expect((await listLeads(filtersFor(country))).total).toBe(2);
    expect(second.id).not.toBe(first.id);
  });
});

describe('CSV export (US-009.5)', () => {
  it('starts with a byte order mark and a header row, and has exactly the filtered leads', async () => {
    const country = newCountry();
    const a = await makeLead({ country, name: 'First Buyer' });
    await makeLead({ country: newCountry(), name: 'Other Country Buyer' });
    const text = await readAll(exportLeadsCsv(filtersFor(country), { id: null, ip: null }));
    const lines = text.replace('﻿', '').trim().split('\r\n');
    expect([text.startsWith('﻿'), lines.length, lines[0].startsWith('id,reference,received (UTC),name,email,phone,company,country,reason,status,assignee,notes'), lines[1].includes(a.id), text.includes('Other Country Buyer')]).toEqual([true, 2, true, true, false]);
  });

  it('writes Arabic correctly as UTF-8', async () => {
    const country = newCountry();
    await makeLead({ country, name: 'أحمد حسن', company: 'شركة النور' });
    const bytes = new Uint8Array(await new Response(exportLeadsCsv(filtersFor(country), { id: null, ip: null })).arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2], new TextDecoder().decode(bytes).includes('شركة النور')]).toEqual([0xef, 0xbb, 0xbf, true]);
  });

  it('defuses spreadsheet formulas and keeps commas, quotes and line breaks inside their cells', async () => {
    const country = newCountry();
    await makeLead({ country, name: '=cmd|"/c calc"!A1', company: '+SUM(1,2)', message: 'Dear team,\n"please" call,\r\nthanks' });
    const text = await readAll(exportLeadsCsv(filtersFor(country), { id: null, ip: null }));
    expect(text).toContain(`"'=cmd|""/c calc""!A1"`);
    expect(text).toContain(`"'+SUM(1,2)"`);
    expect(text).toContain('"Dear team,\n""please"" call,\r\nthanks"');
  });

  it('contains only a header row when no lead matches', async () => {
    const text = await readAll(exportLeadsCsv(filtersFor(newCountry()), { id: null, ip: null }));
    expect(text.replace('﻿', '').trim().split('\r\n')).toHaveLength(1);
  });

  it('streams a large export in full (over 1,000 rows across several batches)', async () => {
    const country = newCountry();
    await db.lead.createMany({
      data: Array.from({ length: 1200 }, (_, i) => ({ reference: `TF-X-${country}-${i}`, reason: 'OTHER' as const, name: `Bulk ${i}`, email: `bulk${i}-${tag}@example.test`, company: 'Co', country, message: 'm', locale: 'en', consent: true, consentAt: new Date(), consentTextVersion: 'v1', createdAt: new Date(Date.now() - i) })),
    });
    const text = await readAll(exportLeadsCsv(filtersFor(country), { id: null, ip: null }));
    expect(text.replace('﻿', '').trim().split('\r\n')).toHaveLength(1201);
  });

  it('logs the export (who, filters) before the first byte, and the row count when the file is complete', async () => {
    const { user } = await as('SALES');
    const country = newCountry();
    await makeLead({ country });
    await makeLead({ country });
    const stream = exportLeadsCsv(filtersFor(country, { status: 'NEW' }), actorOf(user));
    const before = await db.auditLog.count({ where: { action: 'lead.export', actorId: user.id } });
    await readAll(stream);
    const start = await db.auditLog.findFirst({ where: { action: 'lead.export', actorId: user.id } });
    const done = await db.auditLog.findFirst({ where: { action: 'lead.export_complete', actorId: user.id } });
    const startChanges = start?.changes as { filters: string };
    const doneChanges = done?.changes as { filters: string; rows: number };
    expect([before, startChanges.filters.includes('status=NEW'), startChanges.filters.includes(encodeURIComponent(country)), doneChanges.rows]).toEqual([0, true, true, 2]);
  });

  it('still logs an export that is cancelled part-way, but never records it as complete', async () => {
    const { user } = await as('SALES');
    const country = newCountry();
    await makeLead({ country });
    const reader = exportLeadsCsv(filtersFor(country), actorOf(user)).getReader();
    await reader.read(); // only the header chunk
    await reader.cancel();
    expect([await db.auditLog.count({ where: { action: 'lead.export', actorId: user.id } }), await db.auditLog.count({ where: { action: 'lead.export_complete', actorId: user.id } })]).toEqual([1, 0]);
  });

  it('does not copy the search text into the audit log (it may be an email address)', async () => {
    const { user } = await as('SALES');
    const country = newCountry();
    await makeLead({ country });
    await readAll(exportLeadsCsv(filtersFor(country, { q: 'private.person@example.test' }), actorOf(user)));
    const entries = await db.auditLog.findMany({ where: { actorId: user.id, action: { startsWith: 'lead.export' } } });
    expect([JSON.stringify(entries).includes('private.person'), JSON.stringify(entries).includes('qUsed=1')]).toEqual([false, true]);
  });

  it('allows five exports per person per ten minutes and one at a time', () => {
    const id = `export-limit-${Date.now()}`;
    exportLimiter.hit(id); // make sure the key exists, then start fresh
    (exportLimiter as unknown as { hits: Map<string, number[]> }).hits.delete(id);
    const first = acquireExport(id);
    const parallel = acquireExport(id);
    if (!first.ok) throw new Error('first export refused');
    first.release();
    const results = [first.ok, parallel.ok];
    for (let i = 0; i < 4; i++) {
      const r = acquireExport(id);
      if (r.ok) r.release();
      results.push(r.ok);
    }
    const sixth = acquireExport(id);
    expect([results, sixth.ok]).toEqual([[true, false, true, true, true, true], false]);
  });

  it('refuses a sixth export with 429 through the API', async () => {
    const { cookie } = await as('SALES');
    const country = newCountry();
    await makeLead({ country });
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await getExport(request(`/api/admin/leads/export?country=${encodeURIComponent(country)}`, { cookie }));
      codes.push(res.status);
      await res.text(); // read it to the end, which frees the one-at-a-time slot
    }
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('through the API: a download with the right headers for Sales, 403 for a Content editor, 422 for a bad filter', async () => {
    const country = newCountry();
    await makeLead({ country });
    const { cookie } = await as('SALES');
    const ok = await getExport(request(`/api/admin/leads/export?country=${encodeURIComponent(country)}`, { cookie }));
    const bad = await getExport(request('/api/admin/leads/export?status=NOPE', { cookie }));
    const { cookie: editor } = await as('CONTENT_EDITOR');
    const denied = await getExport(request('/api/admin/leads/export', { cookie: editor }));
    expect([ok.status, ok.headers.get('content-type'), ok.headers.get('content-disposition')?.startsWith('attachment; filename="tastino-leads-'), ok.headers.get('cache-control'), bad.status, denied.status]).toEqual([200, 'text/csv; charset=utf-8', true, 'no-store', 422, 403]);
    expect((await ok.text()).includes('Company')).toBe(true);
  });
});

describe('24-month retention flag (US-009.6)', () => {
  const now = new Date('2026-10-25T12:00:00Z');

  it('flags a lead older than 24 calendar months and leaves a younger one alone, without deleting either', async () => {
    const country = newCountry();
    const old = await makeLead({ country, createdAt: new Date('2024-10-24T12:00:00Z') });
    const edge = await makeLead({ country, createdAt: new Date('2024-10-26T12:00:00Z') }); // 23 months and 29 days
    const rows = (await listLeads(filtersFor(country), now)).rows;
    expect([rows.find((r) => r.id === old.id)?.retention, rows.find((r) => r.id === edge.id)?.retention]).toEqual([true, false]);
    expect(await db.lead.count({ where: { id: { in: [old.id, edge.id] } } })).toBe(2);
  });

  it('counts by calendar month across a leap year, not by 730 days', () => {
    expect(subtractMonths(new Date('2026-02-28T00:00:00Z'), 24).toISOString().slice(0, 10)).toBe('2024-02-28');
    expect(subtractMonths(new Date('2028-02-29T00:00:00Z'), 24).toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('filters "past 24 months" and reports the count for the retention screen', async () => {
    const country = newCountry();
    await makeLead({ country, createdAt: new Date('2023-01-01T00:00:00Z') });
    await makeLead({ country, createdAt: new Date('2022-06-01T00:00:00Z') });
    await makeLead({ country, createdAt: new Date('2026-09-01T00:00:00Z') });
    const flagged = await listLeads(filtersFor(country, { retention: '1' }), now);
    const summary = await retentionSummary(now);
    expect([flagged.total, summary.count >= 2, summary.oldest !== null]).toEqual([2, true, true]);
  });

  it('shows a zero count (not an error) when nothing is past the period', async () => {
    const summary = await retentionSummary(new Date('2020-01-01T00:00:00Z'));
    expect([summary.count, summary.oldest]).toEqual([0, null]);
  });

  it('lets only a Super admin open the retention endpoint', async () => {
    const codes: number[] = [];
    for (const role of ['SUPER_ADMIN', 'SALES', 'CONTENT_EDITOR'] as const) {
      const { cookie } = await as(role);
      codes.push((await getRetention(request('/api/admin/leads/retention', { cookie }))).status);
    }
    codes.push((await getRetention(request('/api/admin/leads/retention'))).status);
    expect(codes).toEqual([200, 403, 403, 401]);
  });
});
