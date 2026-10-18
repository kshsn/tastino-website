import type { ReactNode } from 'react';
import './globals.css';

// Each section ([locale] public site, admin) renders its own <html>; this root only passes through.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
