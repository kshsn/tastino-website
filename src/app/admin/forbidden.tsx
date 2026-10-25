import Link from 'next/link';

export default function AdminForbidden() {
  return (
    <main className="adm-pane adm-full">
      <div className="adm-box">
        <h1>You do not have access to this page</h1>
        <p>Your role does not include this part of the admin. If you think that is a mistake, ask a Super admin.</p>
        <Link className="btn primary go" href="/admin">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
