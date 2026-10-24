import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { getAboutPage, getInnovationPage, getLegalPage, getQualityPage } from '@/lib/content/company';
import { getLaunchBlockers } from '@/lib/content/launch';
import { findBanned } from '@/lib/content/rules';
import { runSeed } from '../../prisma/seed/run';

beforeAll(async () => {
  await runSeed(db);
}, 120_000);
afterAll(() => db.$disconnect());

async function withChange<T>(apply: () => Promise<unknown>, restore: () => Promise<unknown>, fn: () => Promise<T>): Promise<T> {
  await apply();
  try {
    return await fn();
  } finally {
    await restore();
  }
}

const approve = (key: 'privacy' | 'terms' | 'consent') =>
  db.setting.upsert({ where: { key: `legal.${key}.approved` }, create: { key: `legal.${key}.approved`, value: '2026-11-01' }, update: { value: '2026-11-01' } });
const unapprove = (key: 'privacy' | 'terms' | 'consent') => db.setting.deleteMany({ where: { key: `legal.${key}.approved` } });

describe('About page data (US-005.1)', () => {
  it('has the official About copy and tagline in English', async () => {
    const { blocks } = await getAboutPage('en');
    expect([blocks.about?.paragraphs.length, blocks.tagline?.paragraphs[0]]).toEqual([3, 'Crafted with Care. Inspired by Nature.']);
  });
  it('has the Arabic copy in Arabic', async () => {
    const { blocks } = await getAboutPage('ar');
    expect(blocks.about?.paragraphs[0]).toContain('تستينو فودز');
  });
  it('contains none of the removed boilerplate', async () => {
    const texts = await Promise.all((['en', 'ar'] as const).map((l) => getAboutPage(l)));
    const all = texts.flatMap((t) => Object.values(t.blocks).flatMap((b) => b?.paragraphs ?? [])).join(' ');
    expect(findBanned(all)).toEqual([]);
  });
  it('takes address and phone from the settings', async () => {
    const { contact } = await getAboutPage('en');
    expect([contact.address, contact.phoneDisplay, contact.email]).toEqual(['Industrial City, 10th of Ramadan, C5, Building No. 21', '+20 110 011 1887', 'info@tastinofoods.com']);
  });
  it('gives the Arabic address in Arabic', async () => {
    expect((await getAboutPage('ar')).contact.address).toBe('المنطقة الصناعية، العاشر من رمضان، C5، مبنى رقم 21');
  });
  it('shows nothing for a setting that is empty (no invented facts)', async () => {
    const contact = await withChange(
      () => db.setting.update({ where: { key: 'contact.phone' }, data: { value: '' } }),
      () => db.setting.update({ where: { key: 'contact.phone' }, data: { value: '+201100111887' } }),
      async () => (await getAboutPage('en')).contact,
    );
    expect([contact.phoneDisplay, contact.tel]).toEqual(['', null]);
  });
  it('drops an email setting that could add extra mail fields to the link', async () => {
    const email = await withChange(
      () => db.setting.update({ where: { key: 'contact.email' }, data: { value: 'a@b.com?bcc=x@y.com' } }),
      () => db.setting.update({ where: { key: 'contact.email' }, data: { value: 'info@tastinofoods.com' } }),
      async () => (await getAboutPage('en')).contact.email,
    );
    expect(email).toBe('');
  });
  it('names the language cookie in the privacy text, in both languages', async () => {
    const en = (await getLegalPage('privacy', 'en')).block!.paragraphs.join(' ');
    const ar = (await getLegalPage('privacy', 'ar')).block!.paragraphs.join(' ');
    expect([en.includes('remembers the language you chose'), ar.includes('اللغة التي اخترتها')]).toEqual([true, true]);
  });
  it('offers three packshots for the collage', async () => {
    expect((await getAboutPage('en')).collage).toHaveLength(3);
  });
  it('leaves the About section out of /ar when its Arabic text is empty (no English fallback)', async () => {
    const [en, ar] = await withChange(
      () => db.pageBlock.update({ where: { key: 'about' }, data: { bodyAr: '' } }),
      () => db.pageBlock.update({ where: { key: 'about' }, data: { bodyAr: 'نص' } }),
      async () => [await getAboutPage('en'), await getAboutPage('ar')] as const,
    );
    expect([en.blocks.about !== undefined, ar.blocks.about !== undefined]).toEqual([true, false]);
  });
});

describe('Quality page data (US-005.2)', () => {
  it('has the official Food Safety Comes First copy', async () => {
    expect((await getQualityPage('en')).blocks['food-safety']?.title).toBe('Food Safety Comes First');
  });
  it('has it in Arabic too', async () => {
    expect((await getQualityPage('ar')).blocks['food-safety']?.title).toBe('سلامة الغذاء أولاً');
  });
  it('names no certification (none exists yet)', async () => {
    const text = [...(await getQualityPage('en')).blocks['food-safety']!.paragraphs, ...(await getQualityPage('ar')).blocks['food-safety']!.paragraphs].join(' ');
    expect(text).not.toMatch(/\b(ISO|HACCP|halal|BRC|FSSC)\b|حلال/i);
  });
});

describe('Innovation page data (US-005.3)', () => {
  it('has the Innovation and Brand Excellence copy', async () => {
    const { blocks } = await getInnovationPage('en');
    expect([blocks.innovation?.title, blocks['brand-excellence']?.title]).toEqual(['Innovation in Every Taste', 'Where Brand Excellence Begins with the Product']);
  });
  it('offers three packshots for the fan', async () => {
    expect((await getInnovationPage('en')).fan).toHaveLength(3);
  });
  it('adds no price number or percentage to the value statement', async () => {
    const text = Object.values((await getInnovationPage('en')).blocks).flatMap((b) => b?.paragraphs ?? []).join(' ');
    expect(text).not.toMatch(/\d+\s?%|\$\s?\d|EGP\s?\d/);
  });
  it('omits an unpublished block', async () => {
    const blocks = await withChange(
      () => db.pageBlock.update({ where: { key: 'brand-excellence' }, data: { status: 'DRAFT' } }),
      () => db.pageBlock.update({ where: { key: 'brand-excellence' }, data: { status: 'PUBLISHED' } }),
      async () => (await getInnovationPage('en')).blocks,
    );
    expect(blocks['brand-excellence']).toBeUndefined();
  });
});

describe('Legal pages (US-005.4 / US-005.5)', () => {
  it('has the privacy text in both languages', async () => {
    const [en, ar] = [await getLegalPage('privacy', 'en'), await getLegalPage('privacy', 'ar')];
    expect([en.block?.title, ar.block?.title]).toEqual(['Privacy Policy', 'سياسة الخصوصية']);
  });
  it('states what is collected, the 24-month retention, the email and the law', async () => {
    const text = (await getLegalPage('privacy', 'en')).block!.paragraphs.join(' ');
    for (const needle of ['name, email address, company, country', '24 months', 'info@tastinofoods.com', 'No. 151 of 2020', 'delete']) expect(text).toContain(needle);
  });
  it('says the same in Arabic: retention, email and the law', async () => {
    const text = (await getLegalPage('privacy', 'ar')).block!.paragraphs.join(' ');
    for (const needle of ['24 شهراً', 'info@tastinofoods.com', '151 لسنة 2020']) expect(text).toContain(needle);
  });
  it('has Terms with section headings', async () => {
    expect((await getLegalPage('terms', 'en')).block!.paragraphs.some((p) => p.startsWith('## '))).toBe(true);
  });
  it('shows a version date', async () => {
    expect((await getLegalPage('privacy', 'en')).updated).toBe('2026-10-24');
  });
  it('is a draft until approval is recorded', async () => {
    expect((await getLegalPage('privacy', 'en')).approved).toBe(false);
  });
  it('is no longer a draft once approved', async () => {
    const approved = await withChange(() => approve('privacy'), () => unapprove('privacy'), async () => (await getLegalPage('privacy', 'en')).approved);
    expect(approved).toBe(true);
  });
  it('has no text for a language whose body is empty (the page then answers 404)', async () => {
    const block = await withChange(
      () => db.pageBlock.update({ where: { key: 'terms' }, data: { bodyAr: '  ' } }),
      () => db.pageBlock.update({ where: { key: 'terms' }, data: { bodyAr: 'نص' } }),
      async () => (await getLegalPage('terms', 'ar')).block,
    );
    expect(block).toBeNull();
  });
});

describe('launch gate (US-005.4 / US-005.5)', () => {
  it('fails while the legal drafts are not approved', async () => {
    expect((await getLaunchBlockers()).map((b) => b.id).sort()).toEqual(['consent-unapproved', 'privacy-unapproved', 'terms-unapproved']);
  });
  it('passes once both are approved', async () => {
    const blockers = await withChange(
      () => Promise.all([approve('privacy'), approve('terms'), approve('consent')]),
      () => Promise.all([unapprove('privacy'), unapprove('terms'), unapprove('consent')]),
      () => getLaunchBlockers(),
    );
    expect(blockers).toEqual([]);
  });
  it('fails when the Arabic text is missing even if approved', async () => {
    const ids = await withChange(
      async () => {
        await approve('terms');
        await db.pageBlock.update({ where: { key: 'terms' }, data: { bodyAr: '' } });
      },
      async () => {
        await unapprove('terms');
        await db.pageBlock.update({ where: { key: 'terms' }, data: { bodyAr: 'نص' } });
      },
      async () => (await getLaunchBlockers()).map((b) => b.id),
    );
    expect(ids).toContain('terms-incomplete');
  });
  it('fails when a legal page is unpublished', async () => {
    const ids = await withChange(
      () => db.pageBlock.update({ where: { key: 'privacy' }, data: { status: 'DRAFT' } }),
      () => db.pageBlock.update({ where: { key: 'privacy' }, data: { status: 'PUBLISHED' } }),
      async () => (await getLaunchBlockers()).map((b) => b.id),
    );
    expect(ids).toContain('privacy-missing');
  });
});
