/**
 * Interface copy in English — the reference dictionary. Other locales are typed
 * against `Dictionary`, so a missing key fails the build instead of shipping blank UI.
 */
export const en = {
  meta: {
    title: 'Citable — can AI search cite your site?',
    description:
      'Scan any URL and see whether ChatGPT, Claude, Perplexity and Google AI Overviews can read, index and cite it — with the exact fixes for what is broken.',
  },

  common: {
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
    loading: 'Loading…',
    backHome: 'Back to home',
  },

  nav: {
    product: 'Product',
    pricing: 'Pricing',
    docs: 'API',
    contact: 'Contact',
    scanCta: 'Scan free',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    home: 'Citable home',
  },

  theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System' },
  language: { label: 'Language' },

  hero: {
    badge: '16 AI agents · 31 checks · ~5 seconds',
    titleLead: 'Can AI actually',
    titleAccent: 'cite',
    titleTail: 'your site?',
    subtitle:
      'Your buyers ask ChatGPT, Claude and Perplexity before they open Google. Citable shows whether those assistants can read, index and quote your pages — and gives you the exact lines to change when they can’t.',
    trust: 'No signup. Free scan. Results in seconds.',
    globeLabel: 'AI agents orbiting your site',
  },

  scanner: {
    placeholder: 'yourdomain.com/your-best-page',
    submit: 'Scan for free',
    scanning: 'Scanning…',
    examples: 'Try:',
    haveKey: 'Have a license key?',
    hideKey: 'Hide license key',
    keyPlaceholder: 'CITE-PRO-XXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX',
    keyHint: 'Saved in this browser only and sent with each scan.',
    keyChecking: 'Checking key…',
    keyValid: (plan: string) => `Key active — ${plan} plan unlocked.`,
    keyInvalid: 'This key is not valid. Check for typos.',
    keyInactive: 'This key is no longer active. Renew your plan to unlock fixes again.',
    stages: [
      'Fetching the page like an AI crawler…',
      'Checking robots.txt against 16 AI agents…',
      'Looking for llms.txt and the sitemap…',
      'Reading structured data and headings…',
      'Scoring…',
    ],
    errors: {
      quota: (limit: number) =>
        `The free plan includes ${limit} scans per day. Upgrade for unlimited scans, or come back tomorrow.`,
      network: 'Could not reach the scanner. Check your connection and try again.',
      generic: 'The scan failed. Please try again in a moment.',
    },
  },

  report: {
    scoreLabel: 'AI Visibility Score',
    grade: 'grade',
    crawlersTitle: 'Who is allowed to read this page',
    crawlersAllOk: 'Every answer engine can reach this URL.',
    crawlersBlocked: (count: number) =>
      count === 1 ? '1 answer engine is blocked by robots.txt.' : `${count} answer engines are blocked by robots.txt.`,
    rule: 'Rule',
    noRule: 'No matching rule — allowed by default',
    fixFirst: 'Fix these first',
    fixFirstHint: 'Ordered by how much each one costs you in citations.',
    howToFix: 'How to fix it',
    locked: 'Step-by-step fix and evidence are included in Pro.',
    critical: 'Critical',
    status: { pass: 'Pass', warn: 'Needs work', fail: 'Failing', info: 'Heads-up' },
    paywallTitle: (count: number) => `${count} more fixes are ready for you`,
    paywallBody:
      'You are seeing the three highest-impact fixes. Pro unlocks every remaining recommendation with copy-paste snippets, the full evidence trail, unlimited scans and API access.',
    paywallCta: 'Unlock all fixes — $7/mo',
    paywallCompare: 'Compare plans',
    emailPrompt: 'Not ready? Get this report by email:',
    breakdown: 'Full breakdown',
    failing: (count: number) => `${count} failing`,
    meta: (date: string, ms: number) => `Scanned ${date} in ${(ms / 1000).toFixed(1)} s`,
    share: 'Copy share link',
    shareCopied: 'Link copied',
    exportJson: 'Download JSON',
    warnings: 'Notes',
    points: 'pts',
  },

  lead: {
    placeholder: 'you@company.com',
    submit: 'Send',
    sending: 'Sending…',
    done: 'Done — you’re on the list.',
    noSpam: 'No spam. One-click unsubscribe.',
    error: 'Could not save your email. Please try again.',
  },

  marquee: { label: 'Checked against the agents that decide who gets cited' },

  stats: {
    checks: 'checks per scan',
    agents: 'AI agents tested',
    categories: 'weighted categories',
    seconds: 'seconds per scan',
  },

  problem: {
    eyebrow: 'Why now',
    title: 'Search moved into the answer. Most sites didn’t.',
    items: [
      {
        title: 'The traffic left quietly',
        body: 'Zero-click answers absorb the questions your content used to rank for. Nothing in your analytics says you were missing from the answer.',
      },
      {
        title: 'Invisible by accident',
        body: 'One wildcard rule in robots.txt, or a page that renders only in the browser, removes you from every answer engine at once.',
      },
      {
        title: 'Being cited is the new ranking',
        body: 'Named as a source, your brand reaches the buyer at the moment of decision — with the assistant vouching for you.',
      },
    ],
  },

  steps: {
    eyebrow: 'How it works',
    title: 'From URL to a fix list in three steps',
    items: [
      { title: 'Paste a URL', body: 'Any public page: your homepage, pricing, docs or best article.' },
      {
        title: 'We read it like an AI',
        body: 'The page, robots.txt, llms.txt and sitemap are fetched without JavaScript and checked against 16 real agents.',
      },
      {
        title: 'Ship the fixes',
        body: 'Every issue comes with evidence and a copy-paste fix, ordered by impact.',
      },
    ],
  },

  categories: {
    eyebrow: 'What we measure',
    title: 'Six categories. One honest score.',
    subtitle: 'Each category is weighted by how much it actually changes the odds of being quoted.',
  },

  agents: {
    title: 'Every agent we test',
    body: 'Live-retrieval agents are scored far more strictly than training crawlers: blocking the first costs you citations today, blocking the second is a licensing choice.',
  },

  pricing: {
    eyebrow: 'Pricing',
    title: 'Simple pricing. Cancel anytime.',
    subtitle: 'Start free. Upgrade when you want every fix, unlimited scans and the API.',
    popular: 'Most popular',
    launch: 'Launch price',
    billing: { forever: 'forever', monthly: '/month', once: 'one-time' },
    plans: {
      free: {
        name: 'Free',
        tagline: 'See where you stand.',
        cta: 'Run a free scan',
        features: [
          '5 scans per day',
          'Full score and category breakdown',
          'All 16 AI agents checked',
          'Top 3 fixes with instructions',
        ],
      },
      pro: {
        name: 'Pro',
        tagline: 'For whoever owns the traffic.',
        cta: 'Get Pro',
        features: [
          'Unlimited scans',
          'Every fix unlocked, with snippets',
          'Full evidence for each check',
          'Full share links and JSON export',
          'API access for CI pipelines',
        ],
      },
      agency: {
        name: 'Agency',
        tagline: 'Audit client sites at scale.',
        cta: 'Get Agency',
        features: [
          'Everything in Pro',
          '2,000 API scans per day (4× Pro)',
          'Unredacted reports to share with clients',
          'Priority email support',
        ],
      },
      lifetime: {
        name: 'Lifetime',
        tagline: 'Pay once, keep Pro.',
        cta: 'Buy lifetime',
        features: ['Everything in Pro, forever', 'One payment, no subscription', 'Early-customer price'],
      },
    },
    redirecting: 'Opening checkout…',
    unavailableTitle: 'Online payments are being set up',
    unavailableBody:
      'Checkout is not live yet. Leave your email and we will send you a link as soon as it opens — or write to us and we will arrange access directly.',
    contactCta: 'Contact us',
    error: 'Could not open checkout. Please try again.',
    secure: 'Secure checkout. Taxes calculated at checkout.',
    cancelled: 'Checkout was cancelled — nothing was charged.',
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Questions, answered',
    items: [
      {
        q: 'What exactly does Citable measure?',
        a: 'Whether an AI assistant can reach your page, read it without running JavaScript, understand what it is about, and lift a confident answer out of it. That is a different question from “do you rank on Google”, and it fails for different reasons.',
      },
      {
        q: 'Why not just use my SEO tool?',
        a: 'Classic SEO tools audit the Google index. They will not tell you that ChatGPT-User is blocked by a wildcard rule, that your llms.txt is missing, or that your pricing page is an empty div to every crawler that matters.',
      },
      {
        q: 'Does blocking GPTBot hurt me?',
        a: 'Blocking training crawlers is a defensible licensing decision, and we score it softly. Blocking live-retrieval agents like ChatGPT-User or Perplexity-User is different: they fetch your page only because a user just asked a question it answers.',
      },
      {
        q: 'Do you crawl my whole site?',
        a: 'No. A scan makes four plain GET requests: the page, robots.txt, llms.txt and the sitemap. It identifies itself as CitableBot.',
      },
      {
        q: 'How do I get my license key after paying?',
        a: 'You see it on screen right after checkout, and it is emailed to you. Paste it under the scanner and every fix unlocks.',
      },
      {
        q: 'Can I cancel?',
        a: 'Yes, anytime. Your plan keeps working until the end of the period you already paid for.',
      },
    ],
  },

  cta: {
    title: 'Find out in five seconds.',
    subtitle: 'The first scan is free, and so is the answer to whether AI can see you.',
    button: 'Scan my site',
  },

  footer: {
    tagline: 'AI search visibility audits for teams that want to be cited.',
    product: 'Product',
    company: 'Company',
    legal: 'Legal',
    rights: (year: number, name: string) => `© ${year} ${name}. All rights reserved.`,
    links: {
      scanner: 'Scanner',
      pricing: 'Pricing',
      docs: 'API docs',
      contact: 'Contact',
      terms: 'Terms',
      privacy: 'Privacy',
      refund: 'Refunds',
    },
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Talk to a human',
    subtitle: 'Questions about plans, invoices, partnerships or a scan result — we read every message.',
    form: {
      name: 'Name',
      email: 'Email',
      topic: 'Topic',
      topics: {
        sales: 'Plans & pricing',
        support: 'Help with a scan',
        billing: 'Billing & invoices',
        partnership: 'Partnership',
        other: 'Something else',
      },
      message: 'Message',
      messagePlaceholder: 'Tell us what you need…',
      submit: 'Send message',
      sending: 'Sending…',
      success: 'Message sent. We will reply by email.',
      error: 'Could not send the message. Please try again.',
      rateLimited: 'Too many messages. Please try again later.',
      tooShort: 'Please write at least 10 characters.',
    },
    direct: 'Other ways to reach us',
    emailLabel: 'Email',
    telegramLabel: 'Telegram',
    socialLabel: 'Social',
    responseTime: (time: string) => `Typical reply time: ${time}`,
    noDirect: 'The form is the fastest way to reach us.',
  },

  docs: {
    eyebrow: 'Developers',
    title: 'Citable API',
    subtitle: 'The same audit that powers the website, as one HTTP call. Included with Pro, Agency and Lifetime.',
    endpoint: 'Endpoint',
    auth: 'Authenticate with your license key as a Bearer token.',
    request: 'Request',
    params: 'Parameters',
    field: 'Field',
    type: 'Type',
    description: 'Description',
    paramUrl: 'Required. The public page to audit.',
    paramMinScore: 'Optional gate, 0–100. Responds with HTTP 422 when the score is lower, so a regression fails your pipeline.',
    paramLang: 'Optional language of the findings: en, ru, es or de. Default: en.',
    response: 'Response',
    codes: 'Status codes',
    code200: 'scan completed',
    code400: 'invalid URL or body',
    code401: 'missing, invalid or inactive key',
    code422: 'scan completed, score below minScore',
    code429: 'daily quota exceeded',
    ciTitle: 'Use it as a deploy gate',
    scoringTitle: 'Scoring model',
    scoringBody: 'The final score is a weighted average of six category scores.',
  },

  checkout: {
    pendingTitle: 'Confirming your payment…',
    pendingBody: 'This usually takes a few seconds. Please keep this page open.',
    readyTitle: 'You’re all set',
    readyBody: 'Your plan is active. This is your license key — it has also been saved in this browser.',
    keyLabel: 'License key',
    useNow: 'Start scanning',
    emailed: 'A copy has been sent to your email.',
    keepSafe: 'Keep it private: anyone with the key can use your plan.',
    slowTitle: 'Still waiting for the payment provider',
    slowBody: 'Your payment may still be processing. Your key will arrive by email; if it does not within 15 minutes, contact us and we will sort it out.',
    inactiveTitle: 'This purchase is no longer active',
    inactiveBody: 'The payment was refunded or the subscription ended.',
    unknownTitle: 'We could not find this checkout',
    unknownBody: 'The link may be incomplete. If you were charged, contact us with your receipt.',
    contactSupport: 'Contact support',
  },

  shared: {
    title: (host: string) => `AI visibility report for ${host}`,
    notFound: 'This report does not exist or has been removed.',
    cta: 'Scan your own site',
    scannedOn: (date: string) => `Scanned on ${date}`,
  },

  notFound: {
    title: 'Page not found',
    body: 'The page you are looking for does not exist or has moved.',
  },
};

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<Widen<U>>
      : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
