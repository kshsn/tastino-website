import { paragraphs, pick } from '@/lib/text';
import { getPageBlock } from './public';

export interface LocalBlock {
  title: string;
  paragraphs: string[];
}

const filled = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * Published copy blocks in one language. A block that is unpublished, or has no title or no text in this language,
 * is left out (there is no fallback to the other language).
 */
export async function loadBlocks<K extends string>(keys: readonly K[], locale: string): Promise<Partial<Record<K, LocalBlock>>> {
  const rows = await Promise.all(keys.map((key) => getPageBlock(key)));
  const out: Partial<Record<K, LocalBlock>> = {};
  for (const row of rows) {
    if (!row) continue;
    const title = pick(locale, row.titleEn, row.titleAr);
    const body = paragraphs(pick(locale, row.bodyEn, row.bodyAr));
    if (filled(title) && body.length > 0) out[row.key as K] = { title, paragraphs: body };
  }
  return out;
}
