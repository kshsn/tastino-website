import type { ReactNode } from 'react';
import { PageTransition } from '@/components/layout/PageTransition';

// A template (unlike a layout) remounts on every navigation, which is what replays the page-in animation.
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
