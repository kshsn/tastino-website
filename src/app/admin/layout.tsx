import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '@/styles/admin.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Tastino admin', template: '%s · Tastino admin' },
  robots: { index: false, follow: false },
};

// Every admin page depends on the session cookie, so none of them is ever built ahead of time or cached.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={jakarta.variable}>
      <body className="adm min-h-screen antialiased">{children}</body>
    </html>
  );
}
