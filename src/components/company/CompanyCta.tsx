import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function CompanyCta() {
  const t = await getTranslations('company.cta');
  return (
    <section className="flush">
      <div className="cta">
        <h2>{t('title')}</h2>
        <div className="actions">
          <Link className="btn btn-primary" href="/distributors">
            <span>{t('button')}</span> <span className="arr" aria-hidden="true">→</span>
          </Link>
          <Link className="btn btn-ghost" href="/products">
            {t('products')}
          </Link>
        </div>
      </div>
    </section>
  );
}
