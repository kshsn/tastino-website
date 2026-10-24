import { db } from '@/lib/db';
import { isBlank } from './rules';

export interface LaunchBlocker {
  id: string;
  message: string;
}

const LEGAL_PAGES = [
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms of Use' },
] as const;

/**
 * Things that must be true before the site goes live (US-005.4, US-005.5). Each entry is a blocker; an empty
 * list means the checks pass. Epic 11's pre-launch checklist runs this too (`npm run check:launch`).
 */
export async function getLaunchBlockers(): Promise<LaunchBlocker[]> {
  const blockers: LaunchBlocker[] = [];
  const [blocks, settings] = await Promise.all([
    db.pageBlock.findMany({ where: { key: { in: LEGAL_PAGES.map((l) => l.key) } } }),
    db.setting.findMany({ where: { key: { in: LEGAL_PAGES.map((l) => `legal.${l.key}.approved`) } } }),
  ]);

  for (const { key, label } of LEGAL_PAGES) {
    const block = blocks.find((b) => b.key === key);
    if (!block || block.status !== 'PUBLISHED') {
      blockers.push({ id: `${key}-missing`, message: `${label} is not published.` });
    } else if ([block.titleEn, block.titleAr, block.bodyEn, block.bodyAr].some(isBlank)) {
      blockers.push({ id: `${key}-incomplete`, message: `${label} needs both English and Arabic text.` });
    }
    const approved = settings.find((s) => s.key === `legal.${key}.approved`)?.value;
    if (typeof approved !== 'string' || approved.trim() === '') {
      blockers.push({ id: `${key}-unapproved`, message: `${label} is still a draft: the client's legal approval is not recorded.` });
    }
  }

  // The consent wording on the lead forms (Arabic and English) needs the same sign-off (US-006.8).
  const consent = await db.setting.findUnique({ where: { key: 'legal.consent.approved' } });
  if (typeof consent?.value !== 'string' || consent.value.trim() === '') {
    blockers.push({ id: 'consent-unapproved', message: "The consent wording on the lead forms is still a draft: the client's legal approval is not recorded." });
  }
  return blockers;
}
