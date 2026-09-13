import Link from 'next/link';

/** Fallback for URLs outside any locale (the middleware normally prevents this). */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-bg p-6 text-fg">
        <div className="text-center">
          <p className="font-mono text-sm text-accent">404</p>
          <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
          <Link href="/" className="btn-primary mt-6">
            Citable
          </Link>
        </div>
      </body>
    </html>
  );
}
