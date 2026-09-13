'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/components/providers';
import { LogoCube } from '@/components/ui/motion';

export default function LocaleNotFound() {
  const { locale, t } = useI18n();
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <LogoCube size={64} />
      <p className="mt-2 font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t.notFound.title}</h1>
      <p className="mt-3 text-muted">{t.notFound.body}</p>
      <Link href={`/${locale}`} className="btn-primary mt-8">
        <ArrowLeft className="h-4 w-4" />
        {t.common.backHome}
      </Link>
    </section>
  );
}
