/**
 * Interface copy in English — the reference dictionary. Other locales are typed
 * against `Dictionary`, so a missing key fails the build instead of shipping blank UI.
 *
 * House rule: every statement on the site must be true of the code as shipped.
 * No invented numbers, testimonials or promises we cannot keep.
 */
export const en = {
  meta: {
    title: 'Citable — check whether AI assistants can read your site',
    description:
      'Scan a page or a whole site and see whether ChatGPT, Claude, Perplexity, Google and other AI agents are allowed to fetch it, can read it without JavaScript, and find clear structured information in it.',
  },

  common: {
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
    loading: 'Loading…',
    backHome: 'Back to home',
    download: 'Download',
    optional: 'optional',
  },

  nav: {
    product: 'How it works',
    pricing: 'Pricing',
    docs: 'API',
    methodology: 'Methodology',
    contact: 'Contact',
    scanCta: 'Check a site',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    home: 'Citable home',
  },

  theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System' },
  language: { label: 'Language' },
  siteTypes: { saas: 'SaaS / web app', ecommerce: 'Online store', blog: 'Blog or media', local: 'Local business', docs: 'Documentation', general: 'General website' },

  hero: {
    badge: (checks: number, agents: number) => `${checks} checks · ${agents} AI agents`,
    titleLead: 'Can AI assistants',
    titleAccent: 'read',
    titleTail: 'your site?',
    subtitle:
      'Citable fetches your pages the way AI crawlers do, applies your robots.txt to each agent, and lists the specific problems it finds on your site — with a fix for each one.',
    trust: (limit: number) => `No sign-up. ${limit} free checks a day.`,
    globeLabel: 'AI agents the scan checks',
  },

  scanner: {
    placeholder: 'yourdomain.com/page',
    submit: 'Check',
    scanning: 'Checking…',
    examples: 'Try:',
    haveKey: 'Enter license key',
    hideKey: 'Hide license key',
    keyPlaceholder: 'Your license key',
    keyHint: 'Stored only in this browser and sent with each check.',
    keyChecking: 'Checking key…',
    keyValid: (plan: string) => `Key active — ${plan} plan.`,
    keyInvalid: 'This key was not recognised. Check for typos.',
    keyInactive: 'This key is no longer active. Renew the plan to use it again.',
    stages: [
      'Fetching the page without JavaScript…',
      'Applying robots.txt to each AI agent…',
      'Looking for llms.txt and the sitemap…',
      'Reading structured data and headings…',
      'Scoring…',
    ],
    siteStages: [
      'Fetching the start page…',
      'Collecting internal links and sitemap entries…',
      'Checking the sampled pages…',
      'Comparing pages with each other…',
      'Scoring…',
    ],
    errors: {
      quota: (limit: number) => `The free plan includes ${limit} checks per day. Come back tomorrow or use a paid plan.`,
      network: 'Could not reach the scanner. Check your connection and try again.',
      generic: 'The check failed. Please try again in a moment.',
    },
    options: {
      toggle: 'Scan settings',
      mode: 'What to check',
      modePage: 'This page',
      modeSite: 'Whole site (sample)',
      modeSiteHint: (limit: number) => `Up to ${limit} pages on your plan, found through internal links and the sitemap.`,
      siteType: 'Site type',
      siteTypeAuto: 'Detect automatically',
      engines: 'Assistants that matter to you',
      enginesHint: 'The access score only counts agents of the selected assistants.',
      allEngines: 'Select all',
      training: 'AI training crawlers',
      trainingAllow: 'I allow them',
      trainingBlock: 'I want them blocked',
      trainingHint: 'Used to judge your robots.txt and to generate a suggested one.',
    },
  },

  report: {
    scoreLabel: 'AI readability score',
    grade: 'grade',
    disclaimer:
      'The score is Citable’s own estimate based on public crawler documentation and web standards. AI companies do not publish such a score, and no tool can guarantee that an assistant will cite you.',
    crawlersTitle: 'Which AI agents robots.txt allows',
    crawlersAllOk: 'robots.txt allows every selected agent to fetch this URL.',
    crawlersBlocked: (count: number) =>
      count === 1 ? 'robots.txt blocks 1 selected agent.' : `robots.txt blocks ${count} selected agents.`,
    notSelected: 'not selected',
    rule: 'Rule',
    noRule: 'No matching rule — allowed by default',
    docs: 'Operator documentation',
    fixFirst: 'Fix these first',
    fixFirstHint: 'Sorted by impact on whether agents can reach and understand the page.',
    howToFix: 'How to fix it',
    locked: 'The step-by-step fix is included in paid plans.',
    critical: 'Critical',
    status: { pass: 'Pass', warn: 'Needs work', fail: 'Failing', info: 'Note' },
    paywallTitle: (count: number) => `${count} more fixes are hidden on the free plan`,
    paywallBody:
      'The free plan shows the three highest-impact fixes. Paid plans show every fix, the evidence behind each check, the generated llms.txt and JSON-LD, and larger site samples.',
    paywallCta: 'See plans',
    breakdown: 'All checks',
    failing: (count: number) => `${count} failing`,
    meta: (date: string, ms: number) => `Checked ${date} in ${(ms / 1000).toFixed(1)} s`,
    share: 'Copy report link',
    shareCopied: 'Link copied',
    exportJson: 'Download JSON',
    warnings: 'Notes',
    points: 'pts',
    profileTitle: 'Detected site type',
    profileSignals: 'Based on',
    profileOverridden: (detected: string) => `Set manually. Detection suggested: ${detected}.`,
    profileNoSignals: 'No strong signals, so only general checks were applied.',
    profileHint: 'Wrong? Choose the type in scan settings and check again — the type-specific checks change.',
    cdn: (name: string) => `Served through ${name}.`,
    topicsTitle: 'What the page is about, to a text-only reader',
    topicsHint: 'The most frequent meaningful words in the visible text. If they do not match your topic, neither will an assistant’s summary.',
    pagesTitle: (count: number) => `Sampled pages (${count})`,
    pagesHint: 'Each page was fetched and checked on its own. Issues list the failing page-level checks.',
    pagesColumns: { page: 'Page', status: 'HTTP', score: 'Score', words: 'Words', issues: 'Issues' },
    pagesNoIssues: 'No issues',
    pagesBlocked: (names: string) => `Blocked for: ${names}`,
    pagesNoindex: 'noindex',
    pagesNotInSitemap: 'not in sitemap',
    generatedTitle: 'Files generated for this site',
    generatedHint: 'Built from what the scan found. Review before publishing.',
    generatedRobots: 'robots.txt',
    generatedLlms: 'llms.txt',
    generatedJsonLd: 'JSON-LD',
    generatedLocked: 'Included in paid plans.',
    generatedNone: 'Not enough information on the page to generate this file.',
  },

  consent: {
    label: 'I agree to the processing of my personal data as described in the',
    consentDoc: 'Consent',
    and: 'and the',
    privacy: 'Privacy Policy',
    required: 'Please tick the consent box to continue.',
  },

  lead: {
    title: 'Get notified when paid plans open',
    placeholder: 'you@company.com',
    submit: 'Notify me',
    sending: 'Saving…',
    done: 'Saved. We will write once, when payments open.',
    note: 'Your email is used only for this notice. You can ask us to delete it at any time.',
    error: 'Could not save your email. Please try again.',
  },

  stats: {
    checks: 'checks in the audit',
    agents: 'AI agents in the robots.txt test',
    categories: 'scored categories',
    pages: 'pages per site scan, maximum',
  },

  problem: {
    eyebrow: 'Why it matters',
    title: 'Common reasons AI assistants skip a page',
    items: [
      {
        title: 'A robots.txt rule blocks the agent',
        body: 'A broad “User-agent: *” disallow, or a rule copied from a template, also applies to agents like ChatGPT-User and PerplexityBot. The site keeps working for people, so nobody notices.',
      },
      {
        title: 'The content only appears after JavaScript',
        body: 'Many AI crawlers read the HTML the server sends and do not run scripts. A page that renders in the browser can arrive as an empty shell.',
      },
      {
        title: 'The page is hard to quote',
        body: 'No clear headings, no structured data, no author or date: an assistant has less to work with when it decides what to use and what to attribute.',
      },
    ],
  },

  steps: {
    eyebrow: 'How it works',
    title: 'From a URL to a list of fixes',
    items: [
      { title: 'Enter a URL', body: 'A single page, or the start page of a site you want sampled.' },
      {
        title: 'Citable reads it like a crawler',
        body: 'The HTML, robots.txt, llms.txt and sitemap are fetched without running JavaScript. In site mode, internal pages are sampled and compared.',
      },
      {
        title: 'You get the problems of that site',
        body: 'Checks adapt to the detected site type. Each problem comes with what we observed and how to fix it, plus generated robots.txt, llms.txt and JSON-LD.',
      },
    ],
  },

  categories: {
    eyebrow: 'What is checked',
    title: 'Six categories, weighted by how much they matter',
    subtitle: 'The weights are Citable’s own judgement. The methodology page lists every check and its sources.',
    methodologyLink: 'Read the methodology',
  },

  agents: {
    title: 'AI agents in the robots.txt test',
    body: 'Agents that fetch pages when a user asks something, and search indexers, count more than training crawlers: blocking training is a legitimate licensing choice. Each name links to the operator’s own documentation.',
  },

  pricing: {
    eyebrow: 'Pricing',
    title: 'Plans',
    subtitle: 'Start free. Pay when you need every fix, larger site samples and the API.',
    popular: 'Recommended',
    billing: { forever: 'free', monthly: '/month', once: 'one-time' },
    kzt: (amount: string) => `≈ ${amount} ₸`,
    plans: {
      free: {
        name: 'Free',
        tagline: 'To see where a site stands.',
        cta: 'Check a site for free',
        features: [
          '5 checks per day',
          'Site mode: up to 5 pages',
          'Score, all checks and the AI agent table',
          'Top 3 fixes with instructions',
          'Generated robots.txt',
        ],
      },
      pro: {
        name: 'Pro',
        tagline: 'For one site or a small team.',
        cta: 'Buy Pro',
        features: [
          'No daily limit on the website',
          'Site mode: up to 15 pages',
          'Every fix, with evidence',
          'Generated llms.txt and JSON-LD',
          'API: 500 checks per day',
        ],
      },
      agency: {
        name: 'Agency',
        tagline: 'For checking client sites.',
        cta: 'Buy Agency',
        features: ['Everything in Pro', 'Site mode: up to 25 pages', 'API: 2,000 checks per day'],
      },
      lifetime: {
        name: 'Lifetime',
        tagline: 'Pro without a subscription.',
        cta: 'Buy Lifetime',
        features: ['Everything in Pro', 'One payment', 'Valid for as long as the service operates'],
      },
    },
    redirecting: 'Opening checkout…',
    unavailableTitle: 'Payments are not open yet',
    unavailableBody:
      'Paid plans cannot be bought on the site yet. Leave your email to hear when they open, or write to us.',
    contactCta: 'Write to us',
    error: 'Could not open checkout. Please try again.',
    notes: {
      gumroad: 'Payment is processed by Gumroad. You receive a license key from Gumroad by email.',
      external: (platform: string) => `Payment is made on ${platform}. Access is confirmed by hand, usually within one working day.`,
      hosted: 'Payment is processed by the payment provider. Taxes, if any, are shown at checkout.',
    },
    legalNote: 'By buying you accept the',
    terms: 'Terms of Service',
    refund: 'Refund Policy',
    cancelled: 'Checkout was cancelled — nothing was charged.',
    buy: {
      title: (plan: string) => `Buy ${plan}`,
      gumroadSteps: [
        'Pay on Gumroad. The page opens in a new tab.',
        'Gumroad emails you a license key right after payment.',
        'Paste the key into “Enter license key” under the scanner. It is checked with Gumroad automatically.',
      ],
      gumroadCta: 'Pay on Gumroad',
      externalSteps: (platform: string) => [
        `Pay on ${platform}. The page opens in a new tab.`,
        'Come back and fill in the form below so we can find your payment.',
        'After we confirm the payment, your key appears on the status page. Keep the link to that page.',
      ],
      externalCta: (platform: string) => `Pay on ${platform}`,
      formTitle: 'I have paid',
      email: 'Email for the license key',
      reference: (platform: string) => `Your name or username on ${platform}`,
      referenceHint: 'We use it only to find your payment.',
      message: 'Comment',
      submit: 'Send for confirmation',
      sending: 'Sending…',
      error: 'Could not send the form. Please try again.',
      rateLimited: 'Too many attempts. Please try again later.',
    },
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Questions',
    items: [
      {
        q: 'What does Citable check?',
        a: 'Whether AI agents are allowed to fetch your pages, whether the content is in the HTML without JavaScript, and whether the page gives clear signals: headings, structured data, title, description, language, author and date. The methodology page lists every check.',
      },
      {
        q: 'Does a high score mean ChatGPT will cite my site?',
        a: 'No. The score measures technical readiness that we can observe from outside. Whether an assistant uses a page also depends on the question, competing sources and the operator’s own systems, which nobody outside those companies can see.',
      },
      {
        q: 'Should I block GPTBot and other training crawlers?',
        a: 'That is your decision. Blocking training crawlers is legitimate. Agents that fetch pages for a user’s question, and search indexers, are separate tokens — blocking those can keep you out of the corresponding assistant’s answers. You can tell the scanner which policy you want.',
      },
      {
        q: 'How much load does a check put on my site?',
        a: 'A page check makes four GET requests: the page, robots.txt, llms.txt and the sitemap. A site check adds one request per sampled page, one at a time. Requests identify themselves as CitableBot, and a “User-agent: CitableBot / Disallow: /” rule in robots.txt stops us from scanning.',
      },
      {
        q: 'How do I get access after paying?',
        a: 'With Gumroad, the license key comes from Gumroad by email. With other platforms, send the form after paying; once the payment is confirmed, the key appears on your status page. Paste the key under the scanner.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Yes. The Refund Policy explains the terms, including a full refund of the first payment within the period stated there.',
      },
    ],
  },

  cta: {
    title: 'Check your site',
    subtitle: 'The first checks are free and need no account.',
    button: 'Check a site',
  },

  footer: {
    tagline: 'Checks whether AI assistants can read and understand a website.',
    product: 'Product',
    company: 'Company',
    legal: 'Legal',
    rights: (year: number, name: string) => `© ${year} ${name}`,
    independent: 'Citable is independent and not affiliated with OpenAI, Anthropic, Google, Perplexity or other companies whose agents it checks.',
    links: {
      scanner: 'Scanner',
      pricing: 'Pricing',
      docs: 'API',
      methodology: 'Methodology',
      about: 'About',
      contact: 'Contact',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      cookies: 'Cookie Policy',
      refund: 'Refund Policy',
      consent: 'Personal data consent',
    },
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Write to us',
    subtitle: 'Questions about plans, payments, a check result or your personal data.',
    form: {
      name: 'Name',
      email: 'Email',
      topic: 'Topic',
      topics: {
        sales: 'Plans and pricing',
        support: 'Help with a check',
        billing: 'Payment or refund',
        privacy: 'My personal data',
        other: 'Something else',
      },
      message: 'Message',
      messagePlaceholder: 'What do you need?',
      submit: 'Send message',
      sending: 'Sending…',
      success: 'Message sent. We will reply to your email.',
      error: 'Could not send the message. Please try again.',
      rateLimited: 'Too many messages. Please try again later.',
      tooShort: 'Please write at least 10 characters.',
    },
    direct: 'Other ways to reach us',
    emailLabel: 'Email',
    telegramLabel: 'Telegram',
    phoneLabel: 'Phone',
    socialLabel: 'Link',
    responseTime: (time: string) => `Usual reply time: ${time}`,
    noDirect: 'Use the form to reach us.',
  },

  docs: {
    eyebrow: 'Developers',
    title: 'Citable API',
    subtitle: 'The same check the website runs, as one HTTP request. Available on Pro, Agency and Lifetime.',
    endpoint: 'Endpoint',
    auth: 'Send your license key as a Bearer token.',
    request: 'Request',
    params: 'Parameters',
    field: 'Field',
    type: 'Type',
    description: 'Description',
    paramUrl: 'Required. The public page to check.',
    paramMinScore: 'Optional, 0–100. The response is HTTP 422 when the score is lower, so a CI job can fail.',
    paramLang: 'Optional language of the findings: en, ru, kk, es or de. Default: en.',
    paramOptions:
      'Optional. mode: "page" or "site"; maxPages (capped by plan); siteType: "auto", "saas", "ecommerce", "blog", "local", "docs" or "general"; engines: list of assistants; blockTraining: true or false.',
    response: 'Response',
    codes: 'Status codes',
    code200: 'check completed',
    code400: 'invalid URL or body',
    code401: 'missing, invalid or inactive key',
    code422: 'check completed, score below minScore',
    code429: 'daily limit reached',
    ciTitle: 'Example: run after each deployment',
    scoringTitle: 'Scoring',
    scoringBody: 'The score is a weighted average of six category scores.',
  },

  methodology: {
    eyebrow: 'Methodology',
    title: 'How the check works',
    subtitle:
      'Everything the score is made of, taken directly from the code that runs the checks. When the code changes, this page changes with it.',
    fetchTitle: 'What is fetched',
    fetchBody: (agent: string) =>
      `Requests are made with the user agent “${agent}”, without running JavaScript, with a time limit per request. Redirects are followed only to public addresses. If robots.txt disallows CitableBot, the site is not scanned.`,
    siteModeTitle: 'Site mode',
    siteModeBody:
      'The scanner collects internal links from the start page and URLs from the sitemap, then fetches pages one at a time within the plan’s page limit and a total time budget. Site-level checks compare the sampled pages: duplicate titles, missing descriptions, pages blocked by robots.txt, thin or script-only pages.',
    profileTitle: 'Site types',
    profileBody:
      'The type is detected from structured data, link targets and wording. Each type adds its own checks — for example product markup for stores or a pricing page for SaaS. You can override the type.',
    scoringTitle: 'Scoring',
    scoringBody:
      'Each check earns part of its weight. Category scores are weighted into a total from 0 to 100. Weights are Citable’s judgement, not a published standard.',
    checksTitle: (count: number) => `All ${count} checks`,
    scope: { page: 'page', site: 'site', 'multi-page': 'site mode' },
    onlyFor: (type: string) => `only for: ${type}`,
    sourcesTitle: 'Sources',
    sources: [
      { label: 'RFC 9309 — Robots Exclusion Protocol', href: 'https://www.rfc-editor.org/rfc/rfc9309' },
      { label: 'llms.txt proposal', href: 'https://llmstxt.org/' },
      { label: 'Schema.org vocabulary', href: 'https://schema.org/' },
      { label: 'Google Search Central: structured data', href: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data' },
      { label: 'OpenAI crawlers', href: 'https://platform.openai.com/docs/bots' },
      { label: 'Perplexity crawlers', href: 'https://docs.perplexity.ai/docs/resources/perplexity-crawlers' },
      { label: 'Google common crawlers', href: 'https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers' },
    ],
    limitsTitle: 'Limits',
    limits: [
      'The scanner sees what a crawler without JavaScript sees. It does not log in and does not bypass bot protection.',
      'robots.txt shows what a site asks. Whether an operator obeys it cannot be verified from outside.',
      'Network-level blocks (a CDN or firewall rejecting AI agents) may treat our requests differently from theirs.',
    ],
  },

  about: {
    eyebrow: 'About',
    title: 'About Citable',
    body: [
      'Citable is a small independent tool that checks whether websites are accessible and understandable to AI assistants and AI search.',
      'It does not promise rankings or citations. It shows what can be measured from outside and explains how to fix it.',
    ],
    operatorTitle: 'Operator',
    operatorName: 'Name',
    registration: 'Registration',
    address: 'Address',
    country: 'Country',
    email: 'Email',
    phone: 'Phone',
    notProvided: 'Details are being prepared.',
    independenceTitle: 'Independence',
    independence:
      'Citable is not affiliated with, endorsed or sponsored by OpenAI, Anthropic, Google, Microsoft, Perplexity, Apple, Meta, Amazon, DuckDuckGo or Common Crawl. Their product and crawler names are used only to describe what the scanner checks.',
    creditsTitle: 'Third-party software and fonts',
    credits: [
      { name: 'Next.js, React', license: 'MIT License', href: 'https://github.com/vercel/next.js' },
      { name: 'Lucide icons', license: 'ISC License', href: 'https://lucide.dev/license' },
      { name: 'Onest font', license: 'SIL Open Font License 1.1', href: 'https://fonts.google.com/specimen/Onest' },
      { name: 'JetBrains Mono font', license: 'SIL Open Font License 1.1', href: 'https://www.jetbrains.com/lp/mono/' },
      { name: 'Motion', license: 'MIT License', href: 'https://motion.dev' },
      { name: 'cheerio', license: 'MIT License', href: 'https://github.com/cheeriojs/cheerio' },
    ],
  },

  checkout: {
    pendingTitle: 'Confirming your payment…',
    pendingBody: 'This usually takes a few seconds. Please keep this page open.',
    reviewTitle: 'We are checking your payment',
    reviewBody:
      'Your request has been received. Once we find the payment, the license key will appear on this page and, if email is set up, in your inbox. Save the link to this page.',
    reviewSave: 'Link to this page',
    rejectedTitle: 'We could not confirm the payment',
    rejectedBody: 'We did not find a payment matching your request. If you did pay, write to us and attach a receipt or screenshot.',
    readyTitle: 'Your plan is active',
    readyBody: 'This is your license key. It has also been saved in this browser.',
    keyLabel: 'License key',
    useNow: 'Start checking',
    emailed: 'A copy has been sent to your email.',
    keepSafe: 'Keep it private: anyone with the key can use your plan.',
    validUntil: (date: string) => `Valid until ${date}.`,
    slowTitle: 'Still waiting for the payment provider',
    slowBody: 'The payment may still be processing. If the key does not appear within 15 minutes, write to us with your receipt.',
    inactiveTitle: 'This purchase is no longer active',
    inactiveBody: 'The payment was refunded or the paid period ended.',
    unknownTitle: 'We could not find this purchase',
    unknownBody: 'The link may be incomplete. If you paid, write to us with your receipt.',
    contactSupport: 'Write to support',
  },

  shared: {
    title: (host: string) => `AI readability report for ${host}`,
    notFound: 'This report does not exist or has been removed.',
    cta: 'Check your own site',
    scannedOn: (date: string) => `Checked on ${date}`,
  },

  notFound: {
    title: 'Page not found',
    body: 'The page you are looking for does not exist or has moved.',
  },
};

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<Widen<U>>
      : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
