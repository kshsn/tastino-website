import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';

interface SignInFrameProps {
  children: ReactNode;
}

/** The two-column sign-in layout of the approved mockup: brand panel on one side, the form on the other. */
export function SignInFrame({ children }: SignInFrameProps) {
  return (
    <div className="adm-split">
      <div className="adm-art" aria-hidden="true">
        <div className="blob" />
        <h2>Manage brands, products and leads in one place.</h2>
        <p>Tastino Foods admin · authorised staff only</p>
      </div>
      <main className="adm-pane">
        <div className="adm-box">
          <Logo label="Tastino Foods Inc" height={74} className="logo" />
          {children}
        </div>
      </main>
    </div>
  );
}
