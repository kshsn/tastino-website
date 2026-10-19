import { getTranslations } from 'next-intl/server';
import { site } from '@/config/site';
import { Link } from '@/i18n/navigation';
import { Logo } from './Logo';

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 text-sm text-muted">
      <div className="mx-auto max-w-[1200px] px-6 pb-10">
        <div className="grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <Logo label={t('meta.siteName')} height={90} className="mb-4 h-[90px] w-auto" />
            <p>{t('footer.tagline')}</p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-ink">{t('nav.brands')}</h2>
            <ul className="space-y-2">
              <li><Link href="/brands" className="hover:text-ink">{t('nav.brands')}</Link></li>
              <li><Link href="/products" className="hover:text-ink">{t('nav.products')}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-ink">{t('footer.company')}</h2>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-ink">{t('nav.about')}</Link></li>
              <li><Link href="/quality" className="hover:text-ink">{t('nav.quality')}</Link></li>
              <li><Link href="/distributors" className="hover:text-ink">{t('nav.cta')}</Link></li>
              <li><Link href="/privacy" className="hover:text-ink">{t('footer.privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-ink">{t('footer.terms')}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold text-ink">{t('footer.contact')}</h2>
            <ul className="space-y-2">
              <li>
                <a href={`mailto:${site.email}`} className="hover:text-ink">{site.email}</a>
              </li>
              <li>
                <span className="sr-only">{t('footer.phone')}: </span>
                <a href={`tel:${site.phoneE164}`} dir="ltr" className="hover:text-ink">{site.phoneDisplay}</a>
              </li>
              <li>
                <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                  {t('footer.whatsapp')} <bdi dir="ltr">{site.phoneDisplay}</bdi>
                </a>
              </li>
              <li><address className="not-italic">{t('footer.address')}</address></li>
            </ul>
            {site.social.length > 0 && (
              <ul className="mt-4 flex gap-3">
                {site.social.map((s) => (
                  <li key={s.network}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink">{s.network}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="mt-8 text-[13px]">{t('footer.rights', { year })}</p>
      </div>
    </footer>
  );
}
