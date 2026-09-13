import { Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { Logo } from './ui/logo';

export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const { contact } = siteConfig;

  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: `/${locale}#scan`, label: t.footer.links.scanner },
        { href: `/${locale}/pricing`, label: t.footer.links.pricing },
        { href: `/${locale}/docs`, label: t.footer.links.docs },
      ],
    },
    {
      title: t.footer.company,
      links: [{ href: `/${locale}/contact`, label: t.footer.links.contact }],
    },
    {
      title: t.footer.legal,
      links: [
        { href: `/${locale}/legal/terms`, label: t.footer.links.terms },
        { href: `/${locale}/legal/privacy`, label: t.footer.links.privacy },
        { href: `/${locale}/legal/refund`, label: t.footer.links.refund },
      ],
    },
  ];

  return (
    <footer className="relative mt-24 border-t border-line">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t.footer.tagline}</p>
          <div className="flex flex-wrap gap-2">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="btn-ghost !px-3 !py-1.5 text-xs">
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </a>
            )}
            {contact.telegram && (
              <a
                href={`https://t.me/${contact.telegram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost !px-3 !py-1.5 text-xs"
              >
                <Send className="h-3.5 w-3.5" />@{contact.telegram.replace(/^@/, '')}
              </a>
            )}
          </div>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-faint">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted transition hover:text-fg">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-faint sm:flex-row">
          <span>{t.footer.rights(new Date().getFullYear(), siteConfig.legal.entityName || siteConfig.name)}</span>
        </div>
      </div>
    </footer>
  );
}
