import { Link } from '@/i18n/navigation';

interface MoreLinksProps {
  items: { href: string; label: string }[];
}

export function MoreLinks({ items }: MoreLinksProps) {
  return (
    <div className="more-cards">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <span>{item.label}</span>
          <span className="arr" aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
