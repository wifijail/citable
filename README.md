# Citable — AI Search Visibility Auditor

**Can AI actually cite your site?** Citable scans any URL and reports whether ChatGPT, Claude,
Perplexity and Google AI Overviews can reach, read, index and quote it — then hands you the exact
lines to change when they cannot.

Live scan, no signup. 31 checks across 6 weighted categories, 16 AI agents evaluated against your
real `robots.txt`.

```
┌──────────────────────────────────────────────────────────────┐
│  AI VISIBILITY SCORE   82 / B                                │
│  Crawler Access 100 · Readability 90 · Structured Data 44    │
│  Answerability 65 · Identity 85 · Technical 93               │
└──────────────────────────────────────────────────────────────┘
```

- **What it is and who it's for:** [PRODUCT_SPEC.md](PRODUCT_SPEC.md)
- **API reference:** `/docs` route, or [`src/app/docs/page.tsx`](src/app/docs/page.tsx)

---

## Why this exists

Classic SEO tools audit the Google index. They will not tell you that:

- `ChatGPT-User` is blocked by a wildcard rule you added two years ago for scrapers;
- your pricing page renders client-side and reads as an empty `<div>` to every crawler that matters;
- you have no `llms.txt`, no `author`, and no `dateModified`, so a model has no reason to trust you
  over the three competitors who do.

Being *cited* is the new ranking. Citable measures exactly that.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — the app runs with zero configuration
npm run dev
```

Open http://localhost:3000 and scan a URL.

Everything works without any environment variable: payments degrade to a waitlist capture, leads
are logged instead of forwarded, and licensing simply reports the free plan.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (Vitest, 30 tests) |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals`) |
| `npm run verify` | Typecheck → lint → test → build. Run this before pushing. |

---

## Configuration

All variables are optional. See [`.env.example`](.env.example) for the annotated list.

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Correct canonical + Stripe redirects | Defaults to `http://localhost:3000` |
| `LICENSE_SECRET` | Paid plans | Any long random string: `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | Checkout | Without it, the pricing CTA becomes a waitlist form |
| `STRIPE_WEBHOOK_SECRET` | License issuance | Verifies the `checkout.session.completed` signature |
| `STRIPE_PRICE_PRO_MONTHLY` / `_AGENCY_MONTHLY` / `_LIFETIME` | Checkout | Stripe Price IDs |
| `LEAD_WEBHOOK_URL` | Lead + license delivery | Any Zapier / Make / n8n / ESP endpoint |
| `FREE_DAILY_SCAN_LIMIT` | Free-tier quota | Default `5` |
| `FETCH_TIMEOUT_MS` | Scanner timeouts | Default `10000` |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                     Landing page: hero, scanner, pricing, FAQ (+ FAQPage JSON-LD)
│   ├── docs/page.tsx                Public API documentation
│   ├── robots.ts / sitemap.ts       Our own crawler surface — the tool eats its own cooking
│   └── api/
│       ├── scan/                    Landing-page scan, IP rate limited on the free plan
│       ├── v1/scan/                 Public API, Bearer auth, optional CI score gate
│       ├── checkout/                Stripe Checkout session (REST, no SDK dependency)
│       ├── stripe/webhook/          Signature-verified webhook → issues a license key
│       └── lead/                    Email capture, forwarded to a webhook
├── components/                      Scanner, ReportView, ScoreRing, Pricing, LeadForm
└── lib/
    ├── audit/
    │   ├── fetcher.ts               SSRF-guarded fetch of page + robots + llms.txt + sitemap
    │   ├── robots.ts                RFC 9309 robots parser: groups, longest-match, wildcards, $
    │   ├── crawlers.ts              The 16-agent registry — the part that must stay current
    │   ├── checks/                  Six check suites, one per scored category
    │   ├── score.ts                 Weighted scoring, grading, plan gating
    │   └── index.ts                 Pipeline: fetch → analyse → score → gate
    ├── license.ts                   Stateless HMAC license keys (no database)
    ├── ratelimit.ts                 In-memory per-IP daily quota
    └── plans.ts                     Single source of truth for pricing
```

**Design decisions worth knowing:**

- **Checks never do I/O.** The network is touched once, in `fetchTarget()`, producing a
  `PageSnapshot`. Every check is a pure function of that snapshot, which is why the audit suite is
  unit-testable without mocking HTTP.
- **Licensing has no database.** A key is an HMAC over `plan + reference`, verified locally. Paid
  access costs zero infrastructure; rotating `LICENSE_SECRET` is the revocation mechanism.
- **Stripe is called over REST.** The checkout payload is three form fields and the webhook
  signature is a documented HMAC, so the SDK is not worth the bundle size.
- **Gating happens server-side.** Locked fix text is never sent to the browser.

---

## The public API

```bash
curl -X POST https://your-deployment.vercel.app/api/v1/scan \
  -H "Authorization: Bearer $CITABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/pricing", "minScore": 70}'
```

`minScore` turns the endpoint into a deploy gate: the response is **HTTP 422** when the score falls
below the threshold, so a regression fails your pipeline instead of quietly costing you citations.

Status codes: `200` ok · `400` bad URL · `401` bad key · `422` below gate · `429` quota.

---

## Testing

```bash
npm test
```

30 unit tests covering the robots parser (group selection, longest-match precedence, wildcards,
`$` anchors, empty-`Disallow` semantics), the audit pipeline (a well-optimised page, an empty SPA
shell, a wildcard-blocked site, `noindex`, malformed HTML), scoring, and license signing/tampering.

Manual end-to-end check against a real site:

```bash
npm run build && npm start
curl -s -X POST http://localhost:3000/api/scan -H "Content-Type: application/json" -d '{"url":"stripe.com/pricing"}'
```

---

## Deploy

### Vercel (recommended, free tier is enough)

1. Push this repository to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) — the framework is detected automatically,
   no build settings to change.
3. Add environment variables (at minimum `NEXT_PUBLIC_SITE_URL` and `LICENSE_SECRET`).
4. Deploy.

Or from the CLI:

```bash
npx vercel --prod
```

A scan is one serverless invocation making three or four outbound GETs, which stays comfortably
inside the free tier at ~1000 scans/day.

### Stripe setup (when you are ready to charge)

1. Create three Products/Prices: Pro $19/mo, Agency $79/mo, Lifetime $149 one-time.
2. Put the Price IDs in `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_AGENCY_MONTHLY`,
   `STRIPE_PRICE_LIFETIME`.
3. Add a webhook endpoint pointing at `https://<your-domain>/api/stripe/webhook`, subscribed to
   `checkout.session.completed`, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Set `LEAD_WEBHOOK_URL` to a Zapier/Make/n8n hook that emails the customer their license key
   (the webhook posts `{ type: "license_issued", email, plan, licenseKey }`).

### Other hosts

The app is a standard Next.js 15 project with Node runtime routes — Render, Railway, Fly.io and
Netlify all work with `npm run build` + `npm start`.

---

## Scanning etiquette

Citable identifies itself as `CitableBot/1.0`, makes three or four plain `GET` requests per scan,
respects timeouts, and refuses private, loopback and link-local addresses (SSRF guard in
`assertPublicUrl`). It reads public pages the same way any SEO crawler does, and never submits
forms or follows authenticated flows.

---

## License

MIT — see [LICENSE](LICENSE).
