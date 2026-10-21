import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PACK_KEYS, toQuery, type Filters, type PackKey } from '@/lib/catalogue/filters';
import { pick } from '@/lib/text';

interface Option {
  slug: string;
  nameEn: string;
  nameAr: string;
}

interface FilterBarProps {
  locale: string;
  filters: Filters;
  brands: Option[];
  categories: Option[];
  packs: PackKey[];
  count: number;
}

/**
 * Brand, category and pack filters plus search. Every control is a normal link or a GET form, so filtering
 * works on the server through the URL (shareable, reloadable, no JavaScript needed).
 */
export async function FilterBar({ locale, filters, brands, categories, packs, count }: FilterBarProps) {
  const t = await getTranslations('catalogue');

  const chip = (label: string, key: 'brand' | 'cat' | 'pack', value: string | null) => {
    const active = (filters[key] ?? null) === value;
    return (
      <li key={`${key}-${value ?? 'all'}`}>
        <Link href={`/products${toQuery(filters, { [key]: value })}`} className="fchip" aria-current={active ? 'true' : undefined}>
          {label}
        </Link>
      </li>
    );
  };

  const groups = [
    { key: 'brand' as const, label: t('listing.brand'), items: brands.map((b) => ({ value: b.slug, label: pick(locale, b.nameEn, b.nameAr) })) },
    { key: 'cat' as const, label: t('listing.category'), items: categories.map((c) => ({ value: c.slug, label: pick(locale, c.nameEn, c.nameAr) })) },
    { key: 'pack' as const, label: t('listing.pack'), items: PACK_KEYS.filter((k) => packs.includes(k)).map((k) => ({ value: k, label: t(`packs.${k}`) })) },
  ];

  return (
    <div className="bar">
      <div className="wrap bar-in">
        <form className="row" action={`/${locale}/products`} method="get" role="search" aria-label={t('listing.filtersLabel')}>
          {filters.brand && <input type="hidden" name="brand" value={filters.brand} />}
          {filters.cat && <input type="hidden" name="cat" value={filters.cat} />}
          {filters.pack && <input type="hidden" name="pack" value={filters.pack} />}
          <div className="search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <label htmlFor="q" className="sr-only">{t('listing.searchLabel')}</label>
            <input id="q" name="q" type="search" defaultValue={filters.q} placeholder={t('listing.search')} maxLength={80} />
            <button type="submit">{t('listing.searchButton')}</button>
          </div>
          <p className="count" role="status" aria-live="polite">{t('listing.count', { count })}</p>
        </form>
        {groups.map((g) => (
          <div className="row" key={g.key}>
            <span className="lbl" id={`lbl-${g.key}`}>{g.label}</span>
            <ul className="fchips" aria-labelledby={`lbl-${g.key}`}>
              {chip(t('listing.all'), g.key, null)}
              {g.items.map((i) => chip(i.label, g.key, i.value))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
