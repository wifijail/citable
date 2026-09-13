import { Terminal } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Reveal } from '@/components/ui/motion';
import { getAuditMessages } from '@/i18n/audit';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { CATEGORIES } from '@/lib/audit/types';
import { siteUrl } from '@/lib/plans';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.docs.title, description: t.docs.subtitle, alternates: { canonical: `/${locale}/docs` } };
}

export default async function DocsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const audit = getAuditMessages(locale);
  const base = siteUrl();

  const curl = `curl -X POST ${base}/api/v1/scan \\
  -H "Authorization: Bearer $CITABLE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/pricing", "minScore": 70, "lang": "${locale}"}'`;

  const response = `{
  "url": "https://example.com/pricing",
  "score": 64,
  "grade": "C",
  "verdict": "…",
  "categories": [{ "id": "crawler-access", "score": 88, "checks": [ … ] }],
  "crawlers": [{ "name": "ChatGPT-User", "purpose": "retrieval", "allowed": true }],
  "priorityFixes": [{ "id": "server-rendered-content", "status": "fail", "fix": "…" }],
  "gate": { "minScore": 70, "passed": false }
}`;

  const ci = `# .github/workflows/ai-visibility.yml
name: AI visibility
on: [deployment_status]
jobs:
  citable:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sSf -X POST ${base}/api/v1/scan \\
            -H "Authorization: Bearer \${{ secrets.CITABLE_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{"url": "https://example.com", "minScore": 75}'`;

  const parameters = [
    { field: 'url', type: 'string', description: t.docs.paramUrl },
    { field: 'minScore', type: 'number', description: t.docs.paramMinScore },
    { field: 'lang', type: 'string', description: t.docs.paramLang },
  ];
  const codes = [
    ['200', t.docs.code200],
    ['400', t.docs.code400],
    ['401', t.docs.code401],
    ['422', t.docs.code422],
    ['429', t.docs.code429],
  ] as const;

  return (
    <section className="container-page max-w-4xl py-16 sm:py-24">
      <Reveal>
        <p className="eyebrow">
          <Terminal className="h-3.5 w-3.5" />
          {t.docs.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t.docs.title}</h1>
        <p className="mt-4 text-lg text-muted">{t.docs.subtitle}</p>
      </Reveal>

      <Reveal className="card mt-12 p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">{t.docs.endpoint}</p>
        <p className="mt-2 font-mono text-lg">
          <span className="rounded-md bg-accent/10 px-2 py-0.5 text-accent">POST</span> /api/v1/scan
        </p>
        <p className="mt-3 text-muted">{t.docs.auth}</p>

        <h2 className="mt-8 font-semibold">{t.docs.request}</h2>
        <pre className="code-block mt-3">{curl}</pre>

        <h2 className="mt-8 font-semibold">{t.docs.params}</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t.docs.field}</th>
                <th className="px-4 py-2.5 font-medium">{t.docs.type}</th>
                <th className="px-4 py-2.5 font-medium">{t.docs.description}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {parameters.map((row) => (
                <tr key={row.field}>
                  <td className="px-4 py-3 font-mono text-accent">{row.field}</td>
                  <td className="px-4 py-3 text-faint">{row.type}</td>
                  <td className="px-4 py-3 text-muted">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 font-semibold">{t.docs.response}</h2>
        <pre className="code-block mt-3">{response}</pre>

        <h2 className="mt-8 font-semibold">{t.docs.codes}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {codes.map(([code, description]) => (
            <li key={code} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
              <code className="font-mono text-accent">{code}</code>
              <span className="text-muted">{description}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="card mt-6 p-6 sm:p-8">
        <h2 className="font-semibold">{t.docs.ciTitle}</h2>
        <pre className="code-block mt-4">{ci}</pre>
      </Reveal>

      <Reveal className="card mt-6 p-6 sm:p-8">
        <h2 className="font-semibold">{t.docs.scoringTitle}</h2>
        <p className="mt-2 text-muted">{t.docs.scoringBody}</p>
        <ul className="mt-5 space-y-3">
          {CATEGORIES.map((category) => (
            <li key={category.id} className="grid grid-cols-[4rem_1fr] items-baseline gap-3">
              <span className="font-mono text-sm text-accent">
                {category.weight} {t.report.points}
              </span>
              <span>
                <span className="font-medium">{audit.categories[category.id].label}</span>
                <span className="text-muted"> — {audit.categories[category.id].description}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
