import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckoutClaim } from '@/components/checkout-claim';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ claim?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).checkout.reviewTitle, robots: { index: false, follow: false } };
}

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { claim = '' } = await searchParams;

  return (
    <section className="container-page max-w-2xl py-16 sm:py-24">
      <CheckoutClaim token={claim} />
    </section>
  );
}
