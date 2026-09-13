import { TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { legalIdentityComplete, siteConfig } from '@/config/site';
import { isLocale, LOCALES } from '@/i18n/config';
import { getLegalPack, isLegalSlug, LEGAL_SLUGS, type LegalContext } from '@/i18n/legal';
import { siteUrl } from '@/lib/plans';

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => LEGAL_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isLegalSlug(slug)) return {};
  return { title: getLegalPack(locale).titles[slug], alternates: { canonical: `/${locale}/legal/${slug}` } };
}

/** Missing owner details are shown as ‹placeholders› so nothing is silently invented. */
function context(): LegalContext {
  const placeholder = (value: string, hint: string) => value || `‹${hint}›`;
  return {
    brand: siteConfig.name,
    entity: placeholder(siteConfig.legal.entityName, 'NEXT_PUBLIC_LEGAL_ENTITY_NAME'),
    country: placeholder(siteConfig.legal.country, 'NEXT_PUBLIC_LEGAL_COUNTRY'),
    address: siteConfig.legal.address,
    registration: siteConfig.legal.registrationNumber,
    email: placeholder(siteConfig.contact.email, 'NEXT_PUBLIC_CONTACT_EMAIL'),
    refundDays: siteConfig.legal.refundDays,
    updated: siteConfig.legal.lastUpdated,
    siteUrl: siteUrl(),
  };
}

export default async function LegalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isLegalSlug(slug)) notFound();

  const pack = getLegalPack(locale);
  const document = pack.build[slug](context());

  return (
    <article className="container-page max-w-3xl py-16 sm:py-24">
      {!legalIdentityComplete() && (
        <p className="mb-8 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/5 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          {pack.templateNotice}
        </p>
      )}
      {pack.translationNotice && <p className="mb-6 text-sm text-faint">{pack.translationNotice}</p>}

      <h1 className="text-4xl font-semibold tracking-tight">{document.title}</h1>
      <p className="mt-2 font-mono text-xs text-faint">{pack.updated(context().updated)}</p>
      <p className="mt-6 text-lg leading-relaxed text-muted">{document.intro}</p>

      <div className="mt-10 space-y-8">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
