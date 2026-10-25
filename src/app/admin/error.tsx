'use client';

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Shown when an admin page cannot load (database or network trouble): nothing is half-shown, and Try again reloads it. */
export default function AdminError({ reset }: AdminErrorProps) {
  return (
    <main className="adm-pane adm-full">
      <div className="adm-box">
        <h1>This page could not load</h1>
        <p>Something went wrong while loading it. Nothing was changed. Try again in a moment.</p>
        <button type="button" className="btn primary go" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
