import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/audit/types';

export const metadata: Metadata = {
  title: 'API',
  description:
    'Run a Citable AI-visibility audit from CI. POST /api/v1/scan with a Bearer key and an optional minScore gate that fails the build on regressions.',
};

const CURL = `curl -X POST https://citable.dev/api/v1/scan \\
  -H "Authorization: Bearer $CITABLE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/pricing", "minScore": 70}'`;

const RESPONSE = `{
  "url": "https://example.com/pricing",
  "score": 64,
  "grade": "C",
  "verdict": "Readable by AI crawlers, but not shaped to be quoted...",
  "categories": [
    { "id": "crawler-access", "label": "AI Crawler Access", "score": 88, "checks": [...] }
  ],
  "crawlers": [
    { "name": "ChatGPT-User", "vendor": "OpenAI", "purpose": "retrieval", "allowed": true }
  ],
  "priorityFixes": [
    {
      "id": "server-rendered-content",
      "status": "fail",
      "impact": "critical",
      "summary": "Almost nothing is server-rendered (18 words).",
      "fix": "Render the main content on the server..."
    }
  ],
  "gate": { "minScore": 70, "passed": false }
}`;

const CI = `# .github/workflows/ai-visibility.yml
name: AI visibility
on: [deployment_status]

jobs:
  citable:
    runs-on: ubuntu-latest
    steps:
      - name: Fail the deploy if AI visibility regressed
        run: |
          curl -sSf -X POST https://citable.dev/api/v1/scan \\
            -H "Authorization: Bearer \${{ secrets.CITABLE_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{"url": "https://example.com", "minScore": 75}'`;

export default function DocsPage() {
  return (
    <main className="container-page py-16">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand-400">
        ← Back to Citable
      </Link>

      <h1 className="mt-6 text-4xl font-bold text-white">API</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        The same audit that powers the web app, available as one HTTP call. Included with Pro and
        Agency plans.
      </p>

      <section className="card mt-10 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white">POST /api/v1/scan</h2>
        <p className="mt-2 text-sm text-slate-400">
          Authenticate with your license key as a Bearer token.
        </p>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Request
        </h3>
        <pre className="mt-2">{CURL}</pre>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Parameters
        </h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Field</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-ink-700">
                <td className="py-2 pr-4 font-mono text-brand-300">url</td>
                <td className="py-2 pr-4 text-slate-500">string</td>
                <td className="py-2">Required. The public page to audit.</td>
              </tr>
              <tr className="border-t border-ink-700">
                <td className="py-2 pr-4 font-mono text-brand-300">minScore</td>
                <td className="py-2 pr-4 text-slate-500">number</td>
                <td className="py-2">
                  Optional gate, 0-100. The response is HTTP 422 when the score falls below it, so
                  a regression fails your pipeline.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Response
        </h3>
        <pre className="mt-2">{RESPONSE}</pre>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Status codes
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-400">
          <li>
            <code className="text-brand-300">200</code> — scan completed
          </li>
          <li>
            <code className="text-brand-300">400</code> — invalid URL or body
          </li>
          <li>
            <code className="text-brand-300">401</code> — missing or invalid API key
          </li>
          <li>
            <code className="text-brand-300">422</code> — scan completed but the score is below{' '}
            <code>minScore</code>
          </li>
          <li>
            <code className="text-brand-300">429</code> — daily quota exceeded
          </li>
        </ul>
      </section>

      <section className="card mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Use it as a deploy gate</h2>
        <pre className="mt-4">{CI}</pre>
      </section>

      <section className="card mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Scoring model</h2>
        <p className="mt-2 text-sm text-slate-400">
          The final score is a weighted average of six category scores. Weights reflect how much
          each factor changes the probability of being quoted.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {CATEGORIES.map((category) => (
            <li key={category.id} className="flex items-baseline gap-3">
              <span className="w-16 shrink-0 font-mono text-brand-400">{category.weight} pts</span>
              <span className="text-slate-200">{category.label}</span>
              <span className="text-slate-500">— {category.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-slate-600">
        Need a higher quota or white-label reports?{' '}
        <Link href="/#pricing" className="text-brand-400 hover:underline">
          See the Agency plan
        </Link>
        .
      </p>
    </main>
  );
}
