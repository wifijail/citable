# Citable — AI Search Visibility Auditor

**Can AI actually cite your site?** Citable scans any URL and reports whether ChatGPT, Claude,
Perplexity and Google AI Overviews can reach, read, index and quote it — then hands you the exact
lines to change when they cannot.

Live scan, no signup. 31 checks across 6 weighted categories, 16 AI agents evaluated against your
real `robots.txt`. Interface and findings in English, Russian, Spanish and German.

- **Owner setup guide (Russian, step by step):** [SETUP_RU.md](SETUP_RU.md)
- **Product, audience, business model:** [PRODUCT_SPEC.md](PRODUCT_SPEC.md)
- **API reference:** `/en/docs` on a running site

---

## Features

| Area | What is in the box |
|---|---|
| Audit engine | RFC 9309 robots.txt parser, 16-agent registry, 31 checks, weighted score and grade |
| Localisation | `/en`, `/ru`, `/es`, `/de` URLs, browser-language redirect, hreflang sitemap, localised findings |
| UI | Light / dark / system themes, animated crawler globe (canvas 3D), scroll reveals, spotlight cards, 3D logo cube, reduced-motion support |
| Data | Postgres (Neon / Supabase / any), auto-created schema; in-memory fallback for local dev |
| Monetisation | Lemon Squeezy or Stripe checkout, signed webhooks, license lifecycle (active → cancelled → expired, refunds) |
| Delivery | License shown on the success page and emailed via Resend |
| Sharing | Stored reports at `/{locale}/r/{id}` with generated Open Graph images |
| Owner tools | `/{locale}/admin`: setup checklist, stats, leads (CSV), messages, licenses, manual key issuance |
| Contact & legal | Contact form (stored + emailed), Terms / Privacy / Refund templates filled from env vars |
| API | `POST /api/v1/scan` with Bearer key and a `minScore` CI gate |

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — the app runs with zero configuration
npm run dev
```

Open http://localhost:3000 — you are redirected to your browser's language.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Vitest suite (75 tests) |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint |
| `npm run verify` | Typecheck → lint → test → build |

The store contract tests also run against a real Postgres when `TEST_DATABASE_URL` is set.

---

## Configuration

Every variable is documented in [`.env.example`](.env.example); the Russian guide explains how to
obtain each one. Nothing is required for the site to build.

| Group | Variables | Without them |
|---|---|---|
| Security | `LICENSE_SECRET`, `ADMIN_PASSWORD` | No checkout; admin panel disabled |
| Database | `DATABASE_URL` (or `POSTGRES_URL`) | Data kept in memory, lost on restart |
| Lemon Squeezy | `LEMONSQUEEZY_API_KEY`, `_STORE_ID`, `_WEBHOOK_SECRET`, `_VARIANT_PRO/AGENCY/LIFETIME` | — |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` | Pricing buttons open a waitlist dialog |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL` | Keys shown on screen only |
| Owner details | `NEXT_PUBLIC_CONTACT_*`, `NEXT_PUBLIC_LEGAL_*` | Hidden; legal pages show a template banner |

`GET /api/health` reports which integrations are active (never their values).

---

## Architecture

```
src/
├── middleware.ts                  Locale prefix redirect (cookie → Accept-Language → en)
├── config/site.ts                 Owner details, read from env vars
├── i18n/
│   ├── ui/{en,ru,es,de}.ts        Interface copy, typed against the English dictionary
│   ├── audit/{en,ru,es,de}.ts     Findings, fixes and category copy
│   ├── legal.ts                   Terms / Privacy / Refund templates
│   └── email.ts                   Transactional email copy
├── app/
│   ├── [locale]/                  Home, pricing, docs, contact, legal, shared report, checkout success, admin
│   ├── api/
│   │   ├── scan, v1/scan          Website scan (IP quota) and public API
│   │   ├── checkout               Hosted checkout via the active provider
│   │   ├── webhooks/{stripe,lemonsqueezy}  Signed webhooks → license lifecycle
│   │   ├── license/{claim,verify} Success-page polling and key validation
│   │   ├── lead, contact          Email capture and contact form
│   │   ├── admin/leads            CSV export (admin session)
│   │   └── health                 Integration status
│   ├── icon.tsx, apple-icon.tsx   Favicons generated from the vector mark
│   └── robots.ts, sitemap.ts, manifest.ts
├── components/                    Navbar, footer, landing sections, report UI, motion primitives
└── lib/
    ├── audit/                     Fetcher (SSRF-guarded), robots parser, checks, scoring
    ├── db/                        Store interface, Postgres and memory implementations, schema
    ├── payments/                  Lemon Squeezy and Stripe over REST
    ├── access.ts                  Key → plan resolution (signature + database status)
    ├── fulfillment.ts             Idempotent license creation from payments
    ├── license.ts                 HMAC-signed license keys
    └── admin-auth.ts              Signed admin session cookie
```

**Design decisions worth knowing**

- **Checks never do I/O.** The network is touched once in `fetchTarget()`; every check is a pure
  function of the snapshot, so the suite is testable without HTTP mocks.
- **Two-layer licensing.** A key's HMAC signature rejects forgeries without I/O; the `licenses`
  table decides whether a genuine key is still active, so cancellations and refunds take effect.
- **Idempotent fulfilment.** Licenses are keyed by the checkout's claim token, so webhook retries
  and multiple events per purchase never mint a second key.
- **Plans come from provider product ids**, never from buyer-controllable checkout metadata.
- **Gating happens server-side.** The full report is stored; locked fix text is stripped before it
  reaches a free visitor's browser.
- **Payments over REST.** No provider SDKs: a few form fields and documented HMACs.

---

## Deploy

See [SETUP_RU.md](SETUP_RU.md) for the full walkthrough. In short:

1. Import the repository on [vercel.com/new](https://vercel.com/new).
2. Storage → add **Neon** (free) → it injects `DATABASE_URL`.
3. Add `LICENSE_SECRET`, `ADMIN_PASSWORD`, your contact/legal details and a payment provider.
4. Point the provider's webhook at `/api/webhooks/lemonsqueezy` or `/api/webhooks/stripe`.
5. Redeploy and open `/api/health`.

---

## License

MIT — see [LICENSE](LICENSE).
