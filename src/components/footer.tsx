import { Mail, Phone, Send } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { Logo } from './ui/logo';

export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const { contact, legal } = siteConfig;
  const telegram = contact.telegram.replace(/^@/, '');

  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: `/${locale}#scan`, label: t.footer.links.scanner },
        { href: `/${locale}/pricing`, label: t.footer.links.pricing },
        { href: `/${locale}/methodology`, label: t.footer.links.methodology },
        { href: `/${locale}/docs`, label: t.footer.links.docs },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { href: `/${locale}/about`, label: t.footer.links.about },
        { href: `/${locale}/contact`, label: t.footer.links.contact },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: `/${locale}/legal/terms`, label: t.footer.links.terms },
        { href: `/${locale}/legal/privacy`, label: t.footer.links.privacy },
        { href: `/${locale}/legal/cookies`, label: t.footer.links.cookies },
        { href: `/${locale}/legal/refund`, label: t.footer.links.refund },
        { href: `/${locale}/legal/consent`, label: t.footer.links.consent },
      ],
    },
  ];

  // Seller identification shown on every page, as Kazakhstan's consumer law expects from online sellers.
  const details = [legal.registrationNumber && `ИИН/БИН ${legal.registrationNumber}`, legal.address].filter(Boolean).join(' · ');

  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">{t.footer.tagline}</p>
          <ul className="space-y-1.5 text-sm text-muted">
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-fg">
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 hover:text-fg">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </a>
              </li>
            )}
            {telegram && (
              <li>
                <a href={`https://t.me/${telegram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-fg">
                  <Send className="h-3.5 w-3.5" />@{telegram}
                </a>
              </li>
            )}
          </ul>
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
        <div className="container-page space-y-2 py-6 text-xs text-faint">
          <p>
            {t.footer.rights(new Date().getFullYear(), legal.entityName || siteConfig.name)}
            {details ? ` · ${details}` : ''}
          </p>
          <p>{t.footer.independent}</p>
        </div>
      </div>
    </footer>
  );
}
