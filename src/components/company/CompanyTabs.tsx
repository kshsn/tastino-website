import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export type CompanyTab = 'story' | 'safety' | 'innovation';

const TABS = [
  { key: 'story', href: '/about' },
  { key: 'safety', href: '/quality' },
  { key: 'innovation', href: '/innovation' },
] as const;

interface CompanyTabsProps {
  current: CompanyTab;
}

/**
 * Tab bar linking About, Quality and Innovation. A "Certifications" tab joins when certificates can be
 * uploaded (R2, US-005.6); until then there is nothing to link to, so it is not shown.
 */
export async function CompanyTabs({ current }: CompanyTabsProps) {
  const t = await getTranslations('company.tabs');
  return (
    <nav className="tabs" aria-label={t('label')}>
      <ul>
        {TABS.map((tab) => (
          <li key={tab.key}>
            <Link href={tab.href} aria-current={tab.key === current ? 'page' : undefined}>
              {t(tab.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
