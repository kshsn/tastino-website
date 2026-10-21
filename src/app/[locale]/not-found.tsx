import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/layout/NotFoundContent';

// Static on purpose (no request-dependent helpers): see NotFoundContent.
export const metadata: Metadata = { title: '404 — Tastino Foods', robots: { index: false, follow: false } };

export default function NotFound() {
  return <NotFoundContent />;
}
