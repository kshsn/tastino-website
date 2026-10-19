import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBanned } from '@/lib/content/rules';
import { BLOCK_KEYS, loadOfficialCopy } from '../../prisma/seed/copy';

const FILE = path.resolve('.claude/source/content/official-copy.md');

describe('loadOfficialCopy (US-002.7)', () => {
  it('pairs all six sections in both languages', async () => {
    const blocks = await loadOfficialCopy(FILE);
    expect(blocks.map((b) => b.key)).toEqual([...BLOCK_KEYS]);
  });
  it('fills every title and body in English and Arabic', async () => {
    const blocks = await loadOfficialCopy(FILE);
    expect(blocks.every((b) => b.titleEn && b.titleAr && b.bodyEn && b.bodyAr)).toBe(true);
  });
  it('maps Food Safety to its Arabic counterpart', async () => {
    const block = (await loadOfficialCopy(FILE)).find((b) => b.key === 'food-safety')!;
    expect(block.titleAr).toBe('سلامة الغذاء أولاً');
  });
  it('stores plain text without markdown bold markers', async () => {
    const text = (await loadOfficialCopy(FILE)).map((b) => `${b.titleEn} ${b.bodyEn} ${b.titleAr} ${b.bodyAr}`).join(' ');
    expect(text).not.toContain('**');
  });
  it('contains none of the old borrowed boilerplate', async () => {
    const text = (await loadOfficialCopy(FILE)).map((b) => `${b.bodyEn} ${b.bodyAr}`).join(' ');
    expect(findBanned(text)).toEqual([]);
  });
});
