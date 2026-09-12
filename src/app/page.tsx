import Link from 'next/link';
import { Pricing } from '@/components/Pricing';
import { Scanner } from '@/components/Scanner';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { CATEGORIES } from '@/lib/audit/types';

const FAQ = [
  {
    q: 'What exactly does Citable measure?',
    a: 'Whether an AI assistant can reach your page, read it without executing JavaScript, understand what it is about, and lift a confident answer out of it. That is a different question from "do you rank on Google", and it fails for different reasons.',
  },
  {
    q: 'Why not just use my existing SEO tool?',
    a: 'Classic SEO tools audit the Google index. They do not tell you that ChatGPT-User is blocked by a wildcard rule in your robots.txt, that your llms.txt is missing, or that your pricing page renders client-side and reads as an empty div to every crawler that matters.',
  },
  {
    q: 'Does blocking GPTBot hurt me?',
    a: 'Blocking training crawlers is a defensible licensing decision and we score it softly. Blocking retrieval agents like ChatGPT-User, Claude-User or Perplexity-User is different: those fetch your page only because a user just asked a question it answers. That block costs you the citation, not the training data.',
  },
  {
    q: 'Do you crawl my whole site?',
    a: 'No. A scan makes three or four plain GET requests: the page itself, robots.txt, llms.txt and your sitemap. It identifies itself as CitableBot and behaves like any other SEO crawler.',
  },
  {
    q: 'Can I run this in CI?',
    a: 'Yes. Pro includes an API key for POST /api/v1/scan with an optional minScore gate that returns HTTP 422 when a deploy drops your score, so a regression fails the build instead of quietly costing you citations.',
  },
];

export default function HomePage() {
  const retrievalCount = AI_CRAWLERS.filter((crawler) => crawler.purpose === 'retrieval').length;

  return (
    <>
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-20 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur">
        <nav className="container-page flex h-16 items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-white">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-ink-950">
              C
            </span>
            Citable
          </span>
          <div className="flex items-center gap-5 text-sm">
            <a href="#how-it-works" className="hidden text-slate-400 hover:text-white sm:block">
              How it works
            </a>
            <Link href="/docs" className="hidden text-slate-400 hover:text-white sm:block">
              API
            </Link>
            <a href="#pricing" className="text-slate-400 hover:text-white">
              Pricing
            </a>
            <a href="#scan" className="btn-primary !px-4 !py-2 text-sm">
              Scan a URL
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* -------------------------------------------------------------- hero */}
        <section className="container-page pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="pill bg-brand-500/10 text-brand-300">
              Built for the answer-engine era
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-6xl">
              Can AI actually <span className="text-brand-400">cite</span> your site?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
              Your buyers ask ChatGPT, Claude and Perplexity before they ever open Google. Citable
              scans any URL and shows whether those assistants can read, index and quote it — and
              gives you the exact lines to change when they cannot.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <Scanner />
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            No signup. Results in about five seconds. {AI_CRAWLERS.length} AI agents checked,
            including {retrievalCount} that fetch pages live while answering.
          </p>
        </section>

        {/* ------------------------------------------------------------ problem */}
        <section className="container-page py-20">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'The traffic left, quietly',
                body: 'Zero-click answers absorb the questions your content used to rank for. Nothing in your analytics tells you that you were not in the answer.',
              },
              {
                title: 'Most sites are invisible by accident',
                body: 'A single wildcard rule in robots.txt, or a page that renders client-side, is enough to remove you from every answer engine at once.',
              },
              {
                title: 'Being cited is the new ranking',
                body: 'Getting named as a source puts your brand in front of a buyer at the exact moment of decision — with the assistant vouching for you.',
              },
            ].map((item) => (
              <div key={item.title} className="card p-6">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- how it works */}
        <section id="how-it-works" className="container-page py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Six categories, {CATEGORIES.length > 0 ? '20+' : ''} checks, one score
            </h2>
            <p className="mt-3 text-slate-400">
              Each category is weighted by how much it actually moves the odds of being quoted.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <div key={category.id} className="card p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold text-white">{category.label}</h3>
                  <span className="font-mono text-sm text-brand-400">{category.weight} pts</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {category.description}
                </p>
              </div>
            ))}
          </div>

          <div className="card mt-8 p-6 sm:p-8">
            <h3 className="font-semibold text-white">Every agent we check</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {AI_CRAWLERS.map((crawler) => (
                <span
                  key={crawler.id}
                  className="pill bg-ink-800 font-mono text-slate-300"
                  title={crawler.note}
                >
                  {crawler.name}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              We separate live-retrieval agents from training crawlers, because blocking the first
              costs you citations today while blocking the second is a licensing choice.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------ pricing */}
        <Pricing />

        {/* ---------------------------------------------------------------- faq */}
        <section className="container-page pb-20">
          <h2 className="text-center text-3xl font-bold text-white">Questions</h2>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card group p-5">
                <summary className="cursor-pointer font-medium text-slate-100">{item.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------- footer */}
      <footer className="border-t border-ink-800">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-8 text-sm text-slate-600 sm:flex-row">
          <span>© {new Date().getFullYear()} Citable</span>
          <div className="flex gap-5">
            <Link href="/docs" className="hover:text-slate-300">
              API docs
            </Link>
            <a href="#pricing" className="hover:text-slate-300">
              Pricing
            </a>
            <a href="#scan" className="hover:text-slate-300">
              Run a scan
            </a>
          </div>
        </div>
      </footer>

      {/* The FAQ above, restated for machines — the exact fix this tool recommends. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
    </>
  );
}
