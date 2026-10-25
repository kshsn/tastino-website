import sharp from 'sharp';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { getPublicSettings, getPublishedBrands, getPublishedProducts } from '@/lib/content/public';
import { findSlugRedirect } from '@/lib/content/catalogue';
import { GET as listBrandsRoute, POST as createBrand } from '@/app/api/admin/brands/route';
import { DELETE as deleteBrand, PATCH as patchBrand } from '@/app/api/admin/brands/[id]/route';
import { POST as createProduct } from '@/app/api/admin/products/route';
import { PATCH as patchProduct } from '@/app/api/admin/products/[id]/route';
import { POST as publishRoute } from '@/app/api/admin/publish/route';
import { POST as uploadRoute } from '@/app/api/admin/media/route';
import { DELETE as deleteMediaRoute, PATCH as patchMedia } from '@/app/api/admin/media/[id]/route';
import { PATCH as patchSettings } from '@/app/api/admin/settings/route';
import { PUT as putOrder } from '@/app/api/admin/hero/order/route';
import { POST as createSlide } from '@/app/api/admin/hero/route';
import { PATCH as patchBlock } from '@/app/api/admin/blocks/[id]/route';
import { makeUser, newIp, params, request, resetLimiters, signedIn } from './admin-helpers';

afterAll(() => db.$disconnect());
beforeEach(() => resetLimiters());

let n = 0;
const uid = () => `${Date.now().toString(36)}${(++n).toString(36)}`;
const as = async (role: Role) => {
  const { user } = await makeUser({ role, enrolled: true });
  return { user, ...(await signedIn(user)) };
};
const editor = () => as('CONTENT_EDITOR');
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, any> });
const post = (route: (r: Request) => Promise<Response>, path: string, cookie: string, body: unknown) => route(request(path, { method: 'POST', cookie, body }));
const patch = (route: (r: Request, c: ReturnType<typeof params>) => Promise<Response>, path: string, id: string, cookie: string, body: unknown) =>
  route(request(path, { method: 'PATCH', cookie, body }), params(id));

const png = (seed: number, w = 1200) => sharp({ create: { width: w, height: 800, channels: 3, background: { r: seed % 255, g: 40, b: 90 } } }).png().toBuffer();
async function upload(cookie: string, buf: Buffer, name = 'pic.png', alt: { altEn?: string; altAr?: string } = {}) {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(buf)], { type: 'image/png' }), name);
  if (alt.altEn) form.set('altEn', alt.altEn);
  if (alt.altAr) form.set('altAr', alt.altAr);
  return json(await uploadRoute(new Request('http://localhost:3000/api/admin/media', { method: 'POST', headers: { host: 'localhost:3000', 'x-real-ip': newIp(), cookie }, body: form })));
}

const brandBody = (over: Record<string, unknown> = {}) => ({ slug: `brand-${uid()}`, nameEn: 'Test Brand', nameAr: 'علامة اختبار', accentColor: '#aa3322', ...over });
async function category() {
  return db.category.create({ data: { slug: `cat-${uid()}`, nameEn: 'Cat', nameAr: 'فئة' } });
}
const publish = async (cookie: string, entity: string, id: string, status = 'PUBLISHED') =>
  json(await publishRoute(request('/api/admin/publish', { method: 'POST', cookie, body: { entity, id, status } })));

describe('who may use the content endpoints (US-008.*)', () => {
  it('answers 401 when not signed in, 403 to Sales, and lets a Content editor and a Super admin in', async () => {
    const codes: number[] = [];
    codes.push((await listBrandsRoute(request('/api/admin/brands'))).status);
    codes.push((await listBrandsRoute(request('/api/admin/brands', { cookie: (await as('SALES')).cookie }))).status);
    codes.push((await listBrandsRoute(request('/api/admin/brands', { cookie: (await editor()).cookie }))).status);
    codes.push((await listBrandsRoute(request('/api/admin/brands', { cookie: (await as('SUPER_ADMIN')).cookie }))).status);
    expect(codes).toEqual([401, 403, 200, 200]);
  });

  it('refuses writes to Sales and to anonymous callers on every content endpoint', async () => {
    const { cookie } = await as('SALES');
    const bodies = await Promise.all([
      post(createBrand, '/api/admin/brands', cookie, brandBody()),
      post(createProduct, '/api/admin/products', cookie, {}),
      post(publishRoute, '/api/admin/publish', cookie, { entity: 'brand', id: 'x', status: 'PUBLISHED' }),
      post(uploadRoute, '/api/admin/media', cookie, {}),
      patchSettings(request('/api/admin/settings', { method: 'PATCH', cookie, body: { 'contact.phone': '+20100000000' } })),
    ]);
    const anon = await post(createBrand, '/api/admin/brands', '', brandBody());
    expect([...bodies.map((r) => r.status), anon.status]).toEqual([403, 403, 403, 403, 403, 401]);
  });

  it('lets a Content editor change settings but not a Sales user (settings area)', async () => {
    const { cookie } = await editor();
    const r = await patchSettings(request('/api/admin/settings', { method: 'PATCH', cookie, body: { 'contact.addressEn': `Addr ${uid()}` } }));
    expect(r.status).toBe(200);
  });
});

describe('brands (US-008.1, US-008.3)', () => {
  it('saves a new brand as a draft that the public site does not show', async () => {
    const { cookie } = await editor();
    const body = brandBody();
    const r = await json(await post(createBrand, '/api/admin/brands', cookie, body));
    const publicSlugs = (await getPublishedBrands()).map((b) => b.slug);
    expect([r.status, r.body.item.slug, publicSlugs.includes(body.slug)]).toEqual([201, body.slug, false]);
  });

  it('writes an audit entry for a created brand', async () => {
    const { cookie, user } = await editor();
    const r = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    const entry = await db.auditLog.findFirst({ where: { action: 'brand.create', entityId: r.body.item.id } });
    expect(entry?.actorId).toBe(user.id);
  });

  it('refuses a duplicate slug with "slug_taken"', async () => {
    const { cookie } = await editor();
    const body = brandBody();
    await post(createBrand, '/api/admin/brands', cookie, body);
    const dup = await json(await post(createBrand, '/api/admin/brands', cookie, { ...body, nameEn: 'Other' }));
    expect([dup.status, dup.body.errors.slug]).toEqual([422, 'slug_taken']);
  });

  it('rejects a slug with capitals or spaces, a bad colour and a missing name', async () => {
    const { cookie } = await editor();
    const r = await json(await post(createBrand, '/api/admin/brands', cookie, { slug: 'Bad Slug', accentColor: 'red' }));
    expect(Object.keys(r.body.errors).sort()).toEqual(['accentColor', 'nameEn', 'slug']);
  });

  it('saves a draft with only one language, but publishing lists each missing field', async () => {
    const { cookie } = await editor();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, { slug: `b-${uid()}`, nameEn: 'Only English', accentColor: '#112233' }));
    const r = await publish(cookie, 'brand', made.body.item.id);
    expect([r.status, r.body.errors]).toEqual([422, { nameAr: 'required_to_publish' }]);
  });

  it('treats a whitespace-only name as empty when publishing', async () => {
    const { cookie } = await editor();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody({ nameAr: '   ' })));
    expect((await publish(cookie, 'brand', made.body.item.id)).status).toBe(422);
  });

  it('publishes a complete brand once: a second click changes nothing and adds no second audit entry', async () => {
    const { cookie } = await editor();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    const id = made.body.item.id;
    const first = await publish(cookie, 'brand', id);
    const second = await publish(cookie, 'brand', id);
    const entries = await db.auditLog.count({ where: { action: 'publish', entityType: 'Brand', entityId: id } });
    expect([first.body.changed, second.body.changed, entries]).toEqual([true, false, 1]);
  });

  it('shows a published brand publicly and hides it again when unpublished', async () => {
    const { cookie } = await editor();
    const body = brandBody();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, body));
    await publish(cookie, 'brand', made.body.item.id);
    const live = (await getPublishedBrands()).some((b) => b.slug === body.slug);
    await publish(cookie, 'brand', made.body.item.id, 'DRAFT');
    const after = (await getPublishedBrands()).some((b) => b.slug === body.slug);
    expect([live, after]).toEqual([true, false]);
  });

  it('refuses to empty a required field of a published brand', async () => {
    const { cookie } = await editor();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    await publish(cookie, 'brand', made.body.item.id);
    const r = await json(await patch(patchBrand, '/api/admin/brands/x', made.body.item.id, cookie, { nameAr: ' ' }));
    expect([r.status, r.body.errors.nameAr]).toEqual([422, 'required_to_publish']);
  });

  it('keeps the old address working after the slug of a published brand changes', async () => {
    const { cookie } = await editor();
    const body = brandBody();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, body));
    await publish(cookie, 'brand', made.body.item.id);
    const newSlug = `renamed-${uid()}`;
    await patch(patchBrand, '/api/admin/brands/x', made.body.item.id, cookie, { slug: newSlug });
    expect(await findSlugRedirect('BRAND', body.slug)).toBe(newSlug);
  });

  it('asks for confirmation before hiding a brand that has published products, then hides its products', async () => {
    const { cookie } = await editor();
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    const brandId = made.body.item.id as string;
    await publish(cookie, 'brand', brandId);
    const cat = await category();
    const prod = await json(await post(createProduct, '/api/admin/products', cookie, { slug: `p-${uid()}`, brandId, categoryId: cat.id, nameEn: 'P', nameAr: 'م', descriptionEn: 'd', descriptionAr: 'و', variants: [{ sizeValue: 400, unit: 'G', packType: 'GLASS' }] }));
    await publish(cookie, 'product', prod.body.item.id);
    const ask = await json(await patch(patchBrand, '/api/admin/brands/x', brandId, cookie, { visibility: 'HIDDEN' }));
    const done = await json(await patch(patchBrand, '/api/admin/brands/x', brandId, cookie, { visibility: 'HIDDEN', confirmHide: true }));
    const stillListed = (await getPublishedProducts()).some((p) => p.slug === prod.body.item.slug);
    expect([ask.status, ask.body.publishedProducts, done.status, stillListed]).toEqual([409, 1, 200, false]);
  });

  it('never deletes a brand', async () => {
    const { cookie } = await as('SUPER_ADMIN');
    const made = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    const r = await deleteBrand(request('/api/admin/brands/x', { method: 'DELETE', cookie }));
    expect([r.status, await db.brand.count({ where: { id: made.body.item.id } })]).toEqual([405, 1]);
  });
});

describe('products and variants (US-008.2)', () => {
  async function brandAndCategory(cookie: string) {
    const b = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    return { brandId: b.body.item.id as string, categoryId: (await category()).id };
  }
  const productBody = (o: Record<string, unknown>) => ({ slug: `p-${uid()}`, nameEn: 'Prod', nameAr: 'منتج', descriptionEn: 'Desc', descriptionAr: 'وصف', ...o });

  it('saves a product with its variants as a draft', async () => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const r = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ ...ids, variants: [{ sizeValue: 400, unit: 'G', packType: 'GLASS' }, { sizeValue: 650, unit: 'G', packType: 'GLASS' }] })));
    const saved = await db.product.findUniqueOrThrow({ where: { id: r.body.item.id }, include: { variants: true } });
    expect([r.status, saved.status, saved.variants.length]).toEqual([201, 'DRAFT', 2]);
  });

  it('rejects a duplicate variant (same size and pack type) and saves nothing', async () => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const body = productBody({ ...ids, variants: [{ sizeValue: 400, unit: 'G', packType: 'GLASS' }, { sizeValue: 400, unit: 'G', packType: 'GLASS' }] });
    const r = await json(await post(createProduct, '/api/admin/products', cookie, body));
    expect([r.status, await db.product.count({ where: { slug: body.slug } })]).toEqual([422, 0]);
  });

  it.each([[0], [-5], ['abc']])('rejects a variant size of %s', async (size) => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const r = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ ...ids, variants: [{ sizeValue: size, unit: 'G', packType: 'PET' }] })));
    expect(r.body.errors['variants.0.sizeValue']).toBe('invalid_size');
  });

  it('needs exactly one owner: a brand or a Tastino line, not both and not neither', async () => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const both = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ ...ids, productLine: 'FRESHNESS' })));
    const neither = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ categoryId: ids.categoryId })));
    expect([both.body.errors.brandId, neither.body.errors.brandId]).toEqual(['one_owner', 'one_owner']);
  });

  it('blocks publishing a product with no variants, and with an image that lacks alt text', async () => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const bare = await json(await post(createProduct, '/api/admin/products', cookie, productBody(ids)));
    const noVariants = await publish(cookie, 'product', bare.body.item.id);
    const img = await upload(cookie, await png(uid().length * 7 + n));
    const withImg = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ ...ids, imageId: img.body.asset.id, variants: [{ sizeValue: 1, unit: 'L', packType: 'PET' }] })));
    const noAlt = await publish(cookie, 'product', withImg.body.item.id);
    expect([noVariants.body.errors.variants, noAlt.body.errors.imageId]).toEqual(['variants_required', 'alt_required']);
  });

  it('publishes a complete product, and removing a variant is audited', async () => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const made = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ ...ids, variants: [{ sizeValue: 1, unit: 'L', packType: 'PET' }, { sizeValue: 2, unit: 'L', packType: 'PET' }] })));
    const id = made.body.item.id as string;
    const pub = await publish(cookie, 'product', id);
    await patch(patchProduct, '/api/admin/products/x', id, cookie, { variants: [{ sizeValue: 1, unit: 'L', packType: 'PET' }] });
    const entry = await db.auditLog.findFirst({ where: { action: 'product.update', entityId: id } });
    expect([pub.status, JSON.stringify(entry?.changes)]).toEqual([200, expect.stringContaining('2 L PET')]);
  });

  it('refuses to remove the last variant of a published product', async () => {
    const { cookie } = await editor();
    const ids = await brandAndCategory(cookie);
    const made = await json(await post(createProduct, '/api/admin/products', cookie, productBody({ ...ids, variants: [{ sizeValue: 1, unit: 'L', packType: 'PET' }] })));
    await publish(cookie, 'product', made.body.item.id);
    const r = await json(await patch(patchProduct, '/api/admin/products/x', made.body.item.id, cookie, { variants: [] }));
    expect([r.status, r.body.errors.variants]).toEqual([422, 'variants_required']);
  });
});

describe('media library (US-008.4)', () => {
  it('stores an upload with derivatives and keeps its alt text', async () => {
    const { cookie } = await editor();
    const r = await upload(cookie, await png(100 + n), 'jam.png', { altEn: 'A jar', altAr: 'برطمان' });
    expect([r.status, r.body.asset.altAr, Object.keys(r.body.asset.derivatives.webp).length > 0]).toEqual([201, 'برطمان', true]);
  });

  it('tells the editor when the same file already exists', async () => {
    const { cookie } = await editor();
    const buf = await png(150 + n);
    const first = await upload(cookie, buf);
    const second = await upload(cookie, Buffer.from(buf));
    expect([second.status, second.body.duplicate, second.body.asset.id]).toEqual([200, true, first.body.asset.id]);
  });

  it('rejects an empty file, a text file named .png and a script image, storing nothing', async () => {
    const { cookie } = await editor();
    const before = await db.mediaAsset.count();
    const results = await Promise.all([upload(cookie, Buffer.alloc(0)), upload(cookie, Buffer.from('hello'), 'a.png'), upload(cookie, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), 'x.svg')]);
    expect([results.map((r) => r.status), await db.mediaAsset.count()]).toEqual([[422, 422, 422], before]);
  });

  it('flags a low-resolution image but accepts it', async () => {
    const { cookie } = await editor();
    const r = await upload(cookie, await png(180 + n, 600));
    expect([r.status, r.body.asset.lowRes]).toEqual([201, true]);
  });

  it('saves alt text and finds assets by it', async () => {
    const { cookie } = await editor();
    const made = await upload(cookie, await png(190 + n));
    const word = `zebra${uid()}`;
    await patch(patchMedia as never, '/api/admin/media/x', made.body.asset.id, cookie, { altEn: word });
    const { listMedia } = await import('@/lib/admin/media-service');
    expect((await listMedia(word)).map((a) => a.id)).toEqual([made.body.asset.id]);
  });

  it('will not delete an image that a product uses and says where, but deletes an unused one', async () => {
    const { cookie } = await editor();
    const b = await json(await post(createBrand, '/api/admin/brands', cookie, brandBody()));
    const used = await upload(cookie, await png(200 + n));
    await patch(patchBrand, '/api/admin/brands/x', b.body.item.id, cookie, { imageId: used.body.asset.id });
    const blocked = await json(await deleteMediaRoute(request('/api/admin/media/x', { method: 'DELETE', cookie }), params(used.body.asset.id)));
    const free = await upload(cookie, await png(210 + n));
    const gone = await json(await deleteMediaRoute(request('/api/admin/media/x', { method: 'DELETE', cookie }), params(free.body.asset.id)));
    expect([blocked.status, blocked.body.usage.brands.length, gone.status, await db.mediaAsset.count({ where: { id: free.body.asset.id } })]).toEqual([409, 1, 200, 0]);
  });
});

describe('hero slides (US-008.5)', () => {
  const slide = (o: Record<string, unknown> = {}) => ({ headlineEn: 'Hello', headlineAr: 'أهلا', sublineEn: 'Sub', sublineAr: 'فرعي', ctaLabelEn: 'Go', ctaLabelAr: 'اذهب', ctaHref: '/products', ...o });

  it('rejects a javascript: or http: call-to-action link', async () => {
    const { cookie } = await editor();
    const a = await json(await post(createSlide, '/api/admin/hero', cookie, slide({ ctaHref: 'javascript:alert(1)' })));
    const b = await json(await post(createSlide, '/api/admin/hero', cookie, slide({ ctaHref: 'http://example.com' })));
    expect([a.body.errors.ctaHref, b.body.errors.ctaHref]).toEqual(['invalid_link', 'invalid_link']);
  });

  it('allows at most three published slides', async () => {
    const { cookie } = await editor();
    await db.heroSlide.updateMany({ data: { status: 'DRAFT' } });
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await json(await post(createSlide, '/api/admin/hero', cookie, slide()))).body.item.id);
    const results = [];
    for (const id of ids) results.push((await publish(cookie, 'heroSlide', id)).status);
    const fourth = await publish(cookie, 'heroSlide', ids[3]);
    expect([results, fourth.body.errors.status]).toEqual([[200, 200, 200, 422], 'max_slides']);
  });

  it('cannot publish a slide without a link', async () => {
    const { cookie } = await editor();
    const made = await json(await post(createSlide, '/api/admin/hero', cookie, slide({ ctaHref: '' })));
    expect((await publish(cookie, 'heroSlide', made.body.item.id)).body.errors.ctaHref).toBe('required_to_publish');
  });

  it('saves a new order, and leaves the old order when the list is wrong', async () => {
    const { cookie } = await editor();
    await db.heroSlide.deleteMany();
    const a = (await json(await post(createSlide, '/api/admin/hero', cookie, slide()))).body.item.id as string;
    const b = (await json(await post(createSlide, '/api/admin/hero', cookie, slide()))).body.item.id as string;
    const order = async () => (await db.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } })).map((s) => s.id);
    const ok = await putOrder(request('/api/admin/hero/order', { method: 'PUT', cookie, body: { ids: [b, a] } }));
    const bad = await putOrder(request('/api/admin/hero/order', { method: 'PUT', cookie, body: { ids: [b, 'nope'] } }));
    expect([ok.status, bad.status, await order()]).toEqual([200, 422, [b, a]]);
  });
});

describe('settings (US-008.7)', () => {
  const save = async (cookie: string, body: unknown) => json(await patchSettings(request('/api/admin/settings', { method: 'PATCH', cookie, body })));

  it.each([['0100 123'], ['+20 1'], ['phone'], ['+1234567890123456']])('rejects the phone %s', async (phone) => {
    const { cookie } = await editor();
    expect((await save(cookie, { 'contact.phone': phone })).body.errors['contact.phone']).toBe('invalid_phone');
  });

  it('refuses to clear the email', async () => {
    const { cookie } = await editor();
    expect((await save(cookie, { 'contact.email': '  ' })).body.errors['contact.email']).toBe('required');
  });

  it('accepts only https social links, drops empty ones and refuses a repeated network', async () => {
    const { cookie } = await editor();
    const http = await save(cookie, { social: [{ network: 'facebook', url: 'http://facebook.com/x' }] });
    const js = await save(cookie, { social: [{ network: 'facebook', url: 'javascript:alert(1)' }] });
    const dup = await save(cookie, { social: [{ network: 'facebook', url: 'https://facebook.com/a' }, { network: 'facebook', url: 'https://facebook.com/b' }] });
    const empty = await save(cookie, { social: [{ network: 'facebook', url: '' }, { network: 'instagram', url: 'https://instagram.com/tastino' }] });
    const stored = await getPublicSettings();
    expect([http.body.errors['social.0.url'], js.body.errors['social.0.url'], dup.body.errors['social.1.network'], empty.status, stored.social]).toEqual(['invalid_url', 'invalid_url', 'duplicate', 200, [{ network: 'instagram', url: 'https://instagram.com/tastino' }]]);
  });

  it('shows saved contact details through the public settings and audits the change', async () => {
    const { cookie } = await editor();
    const phone = `+2010${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
    await save(cookie, { 'contact.phone': ` ${phone.slice(0, 3)} ${phone.slice(3)} ` });
    const entry = await db.auditLog.findFirst({ where: { action: 'settings.update' }, orderBy: { createdAt: 'desc' } });
    expect([(await getPublicSettings())['contact.phone'], !!entry]).toEqual([phone, true]);
  });

  it('keeps private settings out of the editable list', async () => {
    await db.setting.upsert({ where: { key: 'smtp.password' }, update: { value: 'secret' }, create: { key: 'smtp.password', value: 'secret', isPrivate: true } });
    const { cookie } = await editor();
    const { GET } = await import('@/app/api/admin/settings/route');
    const text = await (await GET(request('/api/admin/settings', { cookie }))).text();
    expect(text.includes('smtp')).toBe(false);
  });
});

describe('page copy blocks (US-008.6)', () => {
  async function block(key: string, over: Record<string, unknown> = {}) {
    return db.pageBlock.create({ data: { key, titleEn: 'T', titleAr: 'ع', bodyEn: 'Body', bodyAr: 'نص', ...over } });
  }

  it('strips markup from the text and records the previous text in the audit log', async () => {
    const { cookie } = await editor();
    const b = await block(`b-${uid()}`);
    const r = await json(await patch(patchBlock as never, '/api/admin/blocks/x', b.id, cookie, { bodyEn: 'New <script>alert(1)</script>text', expectedUpdatedAt: b.updatedAt.toISOString() }));
    const saved = await db.pageBlock.findUniqueOrThrow({ where: { id: b.id } });
    const entry = await db.auditLog.findFirst({ where: { action: 'block.update', entityId: b.id } });
    expect([r.status, saved.bodyEn.includes('<'), JSON.stringify(entry?.changes).includes('Body')]).toEqual([200, false, true]);
  });

  it('warns the second editor instead of overwriting a newer version', async () => {
    const { cookie } = await editor();
    const b = await block(`b-${uid()}`);
    const first = await json(await patch(patchBlock as never, '/api/admin/blocks/x', b.id, cookie, { bodyEn: 'Mine', expectedUpdatedAt: b.updatedAt.toISOString() }));
    const second = await json(await patch(patchBlock as never, '/api/admin/blocks/x', b.id, cookie, { bodyEn: 'Theirs', expectedUpdatedAt: b.updatedAt.toISOString() }));
    expect([first.status, second.status, second.body.block.bodyEn]).toEqual([200, 409, 'Mine']);
  });

  it('refuses text over 10,000 characters', async () => {
    const { cookie } = await editor();
    const b = await block(`b-${uid()}`);
    const r = await json(await patch(patchBlock as never, '/api/admin/blocks/x', b.id, cookie, { bodyEn: 'x'.repeat(10_001), expectedUpdatedAt: b.updatedAt.toISOString() }));
    expect([r.status, r.body.errors.bodyEn]).toEqual([422, 'too_long:10000']);
  });

  it('will not let a legal page go live with an empty language', async () => {
    const { cookie } = await editor();
    const original = await db.pageBlock.findUnique({ where: { key: 'privacy' } });
    const b = original
      ? await db.pageBlock.update({ where: { key: 'privacy' }, data: { bodyAr: '', status: 'DRAFT' } })
      : await block('privacy', { bodyAr: '' });
    try {
      const r = await publish(cookie, 'pageBlock', b.id);
      expect([r.status, r.body.errors.bodyAr]).toEqual([422, 'required_to_publish']);
    } finally {
      if (original) await db.pageBlock.update({ where: { key: 'privacy' }, data: { bodyAr: original.bodyAr, status: original.status } });
      else await db.pageBlock.delete({ where: { key: 'privacy' } });
    }
  });
});
