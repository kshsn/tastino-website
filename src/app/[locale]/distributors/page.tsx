import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalogue/Breadcrumbs';
import { ContactPanel } from '@/components/leads/ContactPanel';
import { LeadForm } from '@/components/leads/LeadForm';
import { getContactInfo } from '@/lib/content/contact';
import { getPublishedProducts } from '@/lib/content/public';
import { BRAND_KEYS, REASONS, type BrandKey, type Reason } from '@/lib/leads/options';
import { pageMetadata } from '@/lib/metadata';
import { pick } from '@/lib/text';
import '@/styles/leads.css';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, 'distributors', '/distributors');
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DistributorsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const [t, tc, contact] = await Promise.all([getTranslations('leads'), getTranslations('company'), getContactInfo(locale)]);

  // Only known values from the link are used; anything else is ignored.
  const reasonParam = first(query.reason);
  const productSlug = first(query.product);
  const brandParam = first(query.brand);
  let reason: Reason = (REASONS as readonly string[]).includes(reasonParam ?? '') ? (reasonParam as Reason) : 'distributor';
  let product = '';
  if (productSlug && /^[a-z0-9-]{1,120}$/.test(productSlug)) {
    const found = (await getPublishedProducts()).find((p) => p.slug === productSlug);
    if (found) {
      product = pick(locale, found.nameEn, found.nameAr);
      reason = 'product';
    }
  }
  const brands: BrandKey[] = (BRAND_KEYS as readonly string[]).includes(brandParam ?? '') ? [brandParam as BrandKey] : [];

  return (
    <div className="lf page">
      <div className="wrap">
        <Breadcrumbs items={[{ label: tc('crumbs.home'), href: '/' }, { label: t('crumb') }]} />
        <div className="lf-layout">
          <aside className="lf-pitch">
            <div className="eyebrow">{t('eyebrow')}</div>
            <h1>{t('title')}</h1>
            <p>{t('intro')}</p>
            <ul className="lf-who">
              {(t.raw('who') as string[]).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <ContactPanel contact={contact} />
          </aside>
          <div className="lf-card" id="contact">
            <LeadForm initialReason={reason} initialProduct={product} initialBrands={brands} whatsapp={contact.whatsapp} responseTime={contact.responseTime} />
          </div>
        </div>
      </div>
    </div>
  );
}
