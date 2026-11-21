import { describe, expect, it } from 'vitest';
import { filtersToQuery, leadWhere, parseLeadFilters, retentionCutoff, subtractMonths } from '@/lib/admin/leads-filters';
import { csvCell, csvRow, phoneCell } from '@/lib/admin/leads-service';

describe('CSV cells', () => {
  it('leaves plain text alone', () => expect(csvCell('Cairo Foods')).toBe('Cairo Foods'));
  it('turns null and undefined into an empty cell', () => expect([csvCell(null), csvCell(undefined)]).toEqual(['', '']));
  it('quotes commas, quotes and line breaks, doubling inner quotes', () => {
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
  it('defuses a spreadsheet formula by a leading apostrophe', () => {
    expect([csvCell('=1+1'), csvCell('+44 20'), csvCell('-5'), csvCell('@SUM(A1)'), csvCell('\tcmd')]).toEqual(["'=1+1", "'+44 20", "'-5", "'@SUM(A1)", "'\tcmd"]);
  });
  it('defuses a formula that also needs quotes', () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
  });
  it('also defuses a formula hidden behind a space, a quote or a line break', () => {
    expect([csvCell(' =1+1'), csvCell('"=cmd'), csvCell("'+1"), csvCell('\n=1+1'), csvCell('\u0001@x'), csvCell('  -2')]).toEqual(["' =1+1", `"'""=cmd"`, "''+1", `"'\n=1+1"`, "'\u0001@x", "'  -2"]);
  });
  it('does not touch ordinary text that merely contains those characters', () => {
    expect([csvCell('a=b'), csvCell('1 + 1'), csvCell('mail@example.test'), csvCell('well-known')]).toEqual(['a=b', '1 + 1', 'mail@example.test', 'well-known']);
  });
  it('exports a phone number as it is, but not a formula that looks like one', () => {
    expect([phoneCell('+201001234567'), phoneCell('+20 100 123 4567'), phoneCell('+1+1'), phoneCell('=1+1'), phoneCell(null)]).toEqual(['+201001234567', '+20 100 123 4567', "'+1+1", "'=1+1", '']);
  });
  it('keeps Arabic text as it is', () => expect(csvCell('شركة النور')).toBe('شركة النور'));
  it('writes a row with a Windows line end', () => expect(csvRow(['a', 1, true, null])).toBe('a,1,true,\r\n'));
});

describe('calendar months', () => {
  const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
  it('goes back whole calendar months', () => expect(subtractMonths(at('2026-10-25'), 24).toISOString().slice(0, 10)).toBe('2024-10-25'));
  it('clamps the day at the end of a shorter month (leap day)', () => expect(subtractMonths(at('2028-02-29'), 24).toISOString().slice(0, 10)).toBe('2026-02-28'));
  it('clamps 31 March minus one month to the end of February', () => expect(subtractMonths(at('2026-03-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28'));
  it('crosses a year boundary', () => expect(subtractMonths(at('2026-01-15'), 2).toISOString().slice(0, 10)).toBe('2025-11-15'));
  it('has a retention cut-off exactly 24 calendar months back', () => expect(retentionCutoff(at('2026-10-25')).toISOString().slice(0, 10)).toBe('2024-10-25'));
});

describe('lead filters from a query string', () => {
  it('gives sensible defaults', () => {
    const { filters, errors } = parseLeadFilters({});
    expect([filters.archived, filters.page, errors]).toEqual(['no', 1, []]);
  });
  it('reads every filter', () => {
    const { filters } = parseLeadFilters({ status: 'NEW', reason: 'PRODUCT', country: 'Egypt', assignee: 'none', archived: 'only', from: '2026-01-01', to: '2026-01-31', q: ' نور ', retention: '1', page: '3' });
    expect([filters.status, filters.reason, filters.country, filters.assigneeId, filters.archived, filters.from?.toISOString().slice(0, 10), filters.to?.toISOString().slice(0, 10), filters.q, filters.pastRetention, filters.page]).toEqual(['NEW', 'PRODUCT', 'Egypt', 'none', 'only', '2026-01-01', '2026-01-31', 'نور', true, 3]);
  });
  it('reports a wrong status, a wrong reason and a bad date', () => {
    expect(parseLeadFilters({ status: 'DONE', reason: 'X', from: '31/01/2026' }).errors.sort()).toEqual(['date', 'reason', 'status']);
  });
  it('rejects a range that ends before it starts', () => {
    const r = parseLeadFilters({ from: '2026-02-10', to: '2026-02-01' });
    expect([r.errors, r.filters.from, r.filters.to]).toEqual([['range'], undefined, undefined]);
  });
  it('rejects a date that does not exist', () => expect(parseLeadFilters({ from: '2026-02-30' }).errors).toEqual(['date']));
  it('falls back to page 1 for nonsense pages and ignores unknown archived values', () => {
    expect([parseLeadFilters({ page: '-4' }).filters.page, parseLeadFilters({ page: 'abc' }).filters.page, parseLeadFilters({ archived: 'maybe' }).filters.archived]).toEqual([1, 1, 'no']);
  });
  it('shortens an over-long search text', () => expect(parseLeadFilters({ q: 'x'.repeat(500) }).filters.q?.length).toBe(100));
  it('turns filters back into the same query (without the page)', () => {
    const { filters } = parseLeadFilters({ status: 'CLOSED', archived: 'all', q: 'cairo', page: '4' });
    expect(filtersToQuery(filters)).toBe('status=CLOSED&archived=all&q=cairo');
  });
  it('can leave the search text out (the audit log is permanent)', () => {
    const { filters } = parseLeadFilters({ q: 'someone@example.test' });
    expect(filtersToQuery(filters, false, true)).toBe('qUsed=1');
  });
  it('hides archived leads by default and covers the whole last day of a range', () => {
    const where = leadWhere(parseLeadFilters({ to: '2026-01-31' }).filters, new Date('2026-10-25T00:00:00Z'));
    expect(JSON.stringify(where)).toContain('"archived":false');
    expect(JSON.stringify(where)).toContain('2026-02-01T00:00:00.000Z');
  });
});
