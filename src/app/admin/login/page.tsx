import { Logo } from '@/components/layout/Logo';

// Placeholder only. Epic 7 builds sign-in with 2FA, lockout and roles (see design/mockup/admin-login.html).
export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <Logo label="Tastino Foods Inc" height={74} className="h-[74px] w-auto" />
        </div>
        <h1 className="mt-8 text-2xl font-extrabold">Admin sign in</h1>
        <p className="mt-3 text-muted">The admin panel is not available yet.</p>
      </div>
    </main>
  );
}
