import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.about.title, alternates: { canonical: `/${locale}/about` } };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { legal, contact } = siteConfig;

  const operator = [
    { label: t.about.operatorName, value: legal.entityName },
    { label: t.about.registration, value: [legal.registrationNumber, legal.registrationDetails].filter(Boolean).join(', ') },
    { label: t.about.address, value: legal.address },
    { label: t.about.country, value: legal.country },
    { label: t.about.email, value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { label: t.about.phone, value: contact.phone, href: contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : undefined },
  ].filter((row) => row.value);

  return (
    <div className="container-page max-w-3xl py-16 sm:py-24">
      <p className="eyebrow">{t.about.eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t.about.title}</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
        {t.about.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t.about.operatorTitle}</h2>
        {operator.length > 0 ? (
          <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
            {operator.map((row) => (
              <div key={row.label} className="grid gap-1 px-5 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm text-faint">{row.label}</dt>
                <dd className="text-sm">
                  {row.href ? (
                    <a href={row.href} className="hover:underline">
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-muted">
            {t.about.notProvided}{' '}
            <Link href={`/${locale}/contact`} className="underline underline-offset-2">
              {t.footer.links.contact}
            </Link>
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t.about.independenceTitle}</h2>
        <p className="mt-3 leading-relaxed text-muted">{t.about.independence}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">{t.about.creditsTitle}</h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {t.about.credits.map((credit) => (
            <li key={credit.name} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {credit.name}
              </a>
              <span className="text-faint">{credit.license}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
