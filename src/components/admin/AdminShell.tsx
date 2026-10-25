import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { can, ROLE_LABEL, type Area } from '@/lib/admin/permissions';
import type { SessionUser } from '@/lib/admin/session';
import { LogoutButton } from './LogoutButton';

interface NavItem {
  area: Area;
  label: string;
  href: string;
  /** Built in a later epic: shown dimmed, not clickable. */
  soon?: boolean;
}

// Only the areas the signed-in role may open are rendered at all (US-007.4).
const NAV: NavItem[] = [
  { area: 'dashboard', label: 'Dashboard', href: '/admin' },
  { area: 'leads', label: 'Leads', href: '/admin/leads', soon: true },
  { area: 'content', label: 'Brands & products', href: '/admin/content', soon: true },
  { area: 'users', label: 'Users', href: '/admin/users' },
  { area: 'audit', label: 'Audit log', href: '/admin/audit', soon: true },
  { area: 'settings', label: 'Settings', href: '/admin/settings', soon: true },
];

interface AdminShellProps {
  user: SessionUser;
  current: Area;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** The signed-in frame: sidebar with the role's links, who is signed in, sign out. */
export function AdminShell({ user, current, title, subtitle, children }: AdminShellProps) {
  const items = NAV.filter((n) => can(user.role, n.area));
  return (
    <div className="adm-app">
      <aside className="adm-side">
        <div className="brand">
          <Logo label="Tastino Foods Inc" height={44} className="h-[44px] w-auto" />
        </div>
        <nav aria-label="Admin">
          {items.map((n) =>
            n.soon ? (
              <span key={n.area} className="off" aria-disabled="true">
                {n.label}
                <em>Soon</em>
              </span>
            ) : (
              <a key={n.area} href={n.href} aria-current={n.area === current ? 'page' : undefined}>
                {n.label}
              </a>
            ),
          )}
        </nav>
        <div className="me">
          <div>
            <b>{user.name}</b>
            <span>{ROLE_LABEL[user.role]}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="adm-main" id="main">
        <div className="adm-top">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
