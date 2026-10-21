import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export interface Crumb {
  label: string;
  /** Omit for the current page (the last crumb). */
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export async function Breadcrumbs({ items }: BreadcrumbsProps) {
  const t = await getTranslations('catalogue');
  return (
    <nav className="crumbs" aria-label={t('nav')}>
      <ol>
        {items.map((c, i) => (
          <li key={`${i}-${c.label}`}>
            {c.href && i < items.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
