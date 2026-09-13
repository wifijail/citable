import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Faq } from '@/components/landing/faq';
import { Pricing } from '@/components/landing/pricing';
import { Reveal } from '@/components/ui/motion';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.pricing.eyebrow, description: t.pricing.subtitle, alternates: { canonical: `/${locale}/pricing` } };
}

export default async function PricingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { checkout } = await searchParams;
  const t = getDictionary(locale);

  return (
    <div className="relative">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-96" />
      <section className="container-page pb-10 pt-16 sm:pt-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t.pricing.eyebrow}</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{t.pricing.title}</h1>
          <p className="mt-4 text-lg text-muted">{t.pricing.subtitle}</p>
        </Reveal>
        <div className="mt-14">
          <Pricing cancelled={checkout === 'cancelled'} />
        </div>
      </section>
      <section className="container-page py-16">
        <Reveal className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">{t.faq.title}</h2>
          <Faq />
        </Reveal>
      </section>
    </div>
  );
}
