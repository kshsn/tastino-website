import { BANNED_BOILERPLATE, BANNED_SPELLINGS } from './rules';

// Pure checks used by the content crawl test (tests/content) on the rendered public pages (US-004.6).

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&nbsp;': ' ' };

/** Visible text of an HTML page: scripts, styles and tags removed, common entities decoded. */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#x27|#39);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Banned spellings and borrowed boilerplate found in a text (empty list when clean). */
export function bannedHits(text: string): string[] {
  return [...BANNED_SPELLINGS, ...BANNED_BOILERPLATE].filter((re) => re.test(text)).map((re) => re.source);
}

/** Dropped jam and sauce sizes (360g, 370g, 420g) written as "360g", "370 g" or "420gm". */
export function droppedGrammages(text: string): string[] {
  return [...text.matchAll(/(?<![\d.])(360|370|420)\s?(?:g|gm|gr|gram)s?\b/gi)].map((m) => m[0]);
}

/** Absolute page paths found in `href` attributes that match `prefixRegex` (query strings and fragments removed). */
export function linksMatching(html: string, prefixRegex: RegExp): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/href="([^"#?]+)[^"]*"/g)) if (prefixRegex.test(m[1])) found.add(m[1]);
  return [...found];
}

/** The hrefs of every `<a class="tag" …>` on a page: a product page must have exactly one (its brand or the Tastino lines). */
export function ownerLinks(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    if (!/class="[^"]*\btag\b[^"]*"/.test(tag)) continue;
    const href = /href="([^"]*)"/.exec(tag)?.[1];
    if (href) out.push(href);
  }
  return out;
}

/** Product names (the `<h3>` text of each card) that appear more than once on a brand page. */
export function duplicateCardNames(html: string): string[] {
  const names = [...html.matchAll(/<a\b[^>]*class="[^"]*\bpcard\b[^"]*"[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)].map((m) => visibleText(m[1]));
  return [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
}
