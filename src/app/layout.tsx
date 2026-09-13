import './globals.css';

/**
 * The real document (<html lang>, fonts, providers) lives in app/[locale]/layout.tsx
 * so the language attribute matches the URL. This root layout only passes through,
 * which Next.js requires alongside the top-level not-found page.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
