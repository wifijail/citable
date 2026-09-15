import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getLegalPack, isLegalSlug, LEGAL_SLUGS } from '@/i18n/legal';
import { getDictionary } from '@/i18n/ui';
import { legalContext } from '@/lib/legal-context';

// Owner details and the payment platform come from runtime environment variables.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isLegalSlug(slug)) return {};
  return { title: getLegalPack(locale).titles[slug], alternates: { canonical: `/${locale}/legal/${slug}` } };
}

function Paragraph({ text }: { text: string }) {
  const bullet = text.startsWith('• ');
  return (
    <p className={bullet ? 'mt-1.5 pl-4 leading-relaxed text-muted -indent-3' : 'mt-3 leading-relaxed text-muted'}>{text}</p>
  );
}

export default async function LegalPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isLegalSlug(slug)) notFound();

  const pack = getLegalPack(locale);
  const t = getDictionary(locale);
  const context = legalContext();
  const document = pack.build[slug](context);

  return (
    <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t.footer.legal} className="lg:sticky lg:top-24 lg:self-start">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-faint">{t.footer.legal}</p>
        <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {LEGAL_SLUGS.map((item) => (
            <li key={item}>
              <Link
                href={`/${locale}/legal/${item}`}
                aria-current={item === slug ? 'page' : undefined}
                className={
                  item === slug
                    ? 'block rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg'
                    : 'block rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg'
                }
              >
                {pack.titles[item]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="max-w-3xl">
        {pack.translationNotice && <p className="mb-6 text-sm text-faint">{pack.translationNotice}</p>}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{document.title}</h1>
        <p className="mt-2 font-mono text-xs text-faint">{pack.updated(context.updated)}</p>
        <p className="mt-6 text-lg leading-relaxed text-muted">{document.intro}</p>

        <div className="mt-10 space-y-8">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <Paragraph key={paragraph} text={paragraph} />
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
