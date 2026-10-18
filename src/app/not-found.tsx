import Link from 'next/link';

// Fallback for paths outside /en and /ar that the proxy did not redirect (e.g. static files).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-bg p-6 text-ink">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold">Page not found · الصفحة غير موجودة</h1>
          <p className="mt-6 flex justify-center gap-4 font-bold text-blue">
            <Link href="/en">Home</Link>
            <Link href="/ar" lang="ar">الرئيسية</Link>
          </p>
        </div>
      </body>
    </html>
  );
}
