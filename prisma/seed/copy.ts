import { readFile } from 'node:fs/promises';

/** PageBlock keys in the order the sections appear in official-copy.md (same order in both languages). */
export const BLOCK_KEYS = ['about', 'food-safety', 'innovation', 'brand-excellence', 'portfolio', 'partnership'] as const;

export const TAGLINE = { en: 'Crafted with Care. Inspired by Nature.', ar: 'صُنع بعناية، مستوحى من الطبيعة.' };

export interface CopyBlock {
  key: (typeof BLOCK_KEYS)[number];
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

function sections(md: string, heading: string): { title: string; body: string }[] {
  const start = md.indexOf(heading);
  if (start < 0) throw new Error(`official copy: missing "${heading}" section`);
  const rest = md.slice(start + heading.length);
  const end = rest.search(/\n## /);
  const part = end < 0 ? rest : rest.slice(0, end);
  return part
    .split(/\n### /)
    .slice(1)
    .map((chunk) => {
      const [titleLine, ...lines] = chunk.split('\n');
      const body = lines
        .join('\n')
        .replace(/\n-{3,}\s*$/m, '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p && p !== '---')
        .join('\n\n');
      return { title: titleLine.trim(), body };
    });
}

/** Reads the client-supplied copy and pairs English and Arabic sections by order. */
export async function loadOfficialCopy(file: string): Promise<CopyBlock[]> {
  // The source file uses a little markdown (bold labels). Stored text is plain, so the markers are dropped.
  const md = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n').replace(/\*\*/g, '');
  const en = sections(md, '## English');
  const ar = sections(md, '## العربية');
  if (en.length !== BLOCK_KEYS.length || ar.length !== BLOCK_KEYS.length) {
    throw new Error(`official copy: expected ${BLOCK_KEYS.length} sections per language, got EN=${en.length} AR=${ar.length}`);
  }
  return BLOCK_KEYS.map((key, i) => ({
    key,
    titleEn: en[i].title,
    titleAr: ar[i].title,
    bodyEn: en[i].body,
    bodyAr: ar[i].body,
  }));
}
