import { Clock, Globe, Mail, Phone, Send } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContactForm } from '@/components/contact-form';
import { Reveal } from '@/components/ui/motion';
import { siteConfig } from '@/config/site';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.contact.eyebrow, description: t.contact.subtitle, alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { contact } = siteConfig;
  const telegram = contact.telegram.replace(/^@/, '');

  const channels = [
    contact.email && { Icon: Mail, label: t.contact.emailLabel, value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { Icon: Phone, label: t.contact.phoneLabel, value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` },
    telegram && { Icon: Send, label: t.contact.telegramLabel, value: `@${telegram}`, href: `https://t.me/${telegram}` },
    contact.social && {
      Icon: Globe,
      label: t.contact.socialLabel,
      value: contact.social.replace(/^https?:\/\//, ''),
      href: contact.social,
    },
  ].filter((channel): channel is { Icon: typeof Mail; label: string; value: string; href: string } => Boolean(channel));

  return (
    <section className="container-page py-16 sm:py-24">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">{t.contact.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t.contact.title}</h1>
        <p className="mt-4 text-lg text-muted">{t.contact.subtitle}</p>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Reveal>
          <ContactForm />
        </Reveal>
        <Reveal delay={0.1}>
          <aside className="card h-full p-6 sm:p-8">
            <h2 className="font-semibold">{t.contact.direct}</h2>
            {channels.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {channels.map(({ Icon, label, value, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={/^(mailto|tel):/.test(href) ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2">
                        <Icon className="h-4 w-4 text-muted" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-faint">{label}</span>
                        <span className="block truncate text-sm">{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">{t.contact.noDirect}</p>
            )}
            {contact.responseTime && (
              <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                <Clock className="h-4 w-4 text-faint" />
                {t.contact.responseTime(contact.responseTime)}
              </p>
            )}
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
