/**
 * Audit findings in English — the reference dictionary.
 *
 * Every other locale is typed against `AuditMessages`, so a missing or
 * mistyped key in a translation fails `tsc` instead of shipping blank text.
 * Code snippets inside `fix` texts stay identical across languages.
 */

const allowSnippet = (names: string[]) =>
  names.map((name) => `User-agent: ${name}\nAllow: /\n`).join('\n');

export const auditEn = {
  common: {
    missing: 'missing',
    none: 'none',
    yes: 'yes',
    no: 'no',
    httpStatus: (url: string, status: number) => `${url} → HTTP ${status || 'no response'}`,
  },

  categories: {
    'crawler-access': {
      label: 'AI Crawler Access',
      description: 'Whether AI agents are actually allowed to fetch this page at all.',
    },
    'machine-readability': {
      label: 'Machine Readability',
      description: 'Whether the content exists in the raw HTML, without running JavaScript.',
    },
    'structured-data': {
      label: 'Structured Data',
      description: 'Machine-readable facts about the entity, author and freshness.',
    },
    answerability: {
      label: 'Answerability',
      description: 'Whether the content is shaped into quotable, extractable answers.',
    },
    identity: {
      label: 'Metadata & Identity',
      description: 'How the page introduces itself in previews and citations.',
    },
    technical: {
      label: 'Technical Health',
      description: 'Transport, response and indexing signals that can silently hide a page.',
    },
  },

  purposes: {
    retrieval: 'Answers live questions',
    indexing: 'Builds the answer index',
    training: 'Collects training data',
  },

  crawlerNotes: {
    'oai-searchbot': 'Builds the index behind ChatGPT Search results and citations.',
    'chatgpt-user': 'Fetches your page live when a ChatGPT user asks something it answers.',
    gptbot: 'Training corpus collection. Blocking this is a defensible choice.',
    claudebot: 'Training corpus collection for Claude.',
    'claude-user': 'Fetches your page live for a Claude user request.',
    'claude-searchbot': 'Indexes pages so Claude can surface and cite them in search.',
    perplexitybot: 'Builds the Perplexity index — the primary source of its citations.',
    'perplexity-user': 'Live fetch triggered by a Perplexity user action.',
    'google-extended': 'Controls Gemini grounding and AI use without affecting Search rank.',
    googlebot: 'AI Overviews are grounded in the regular Google index — this is mandatory.',
    bingbot: 'Feeds Copilot and several third-party answer engines.',
    'applebot-extended': 'Apple Intelligence training opt-out token.',
    'meta-externalagent': 'Meta AI crawling and training.',
    amazonbot: 'Powers Alexa answers and Rufus product responses.',
    ccbot: 'Common Crawl feeds the majority of open training datasets.',
    duckassistbot: 'DuckDuckGo AI assist answers.',
  },

  verdicts: {
    criticalOne:
      'One critical issue blocks this page from being cited by AI assistants. Fix it first — everything else is secondary.',
    criticalMany: (count: number) =>
      `${count} critical issues block this page from being cited by AI assistants. Fix those first — everything else is secondary.`,
    a: 'This page is in excellent shape for AI search. Keep freshness signals current and watch for regressions.',
    b: 'Solid foundation. A handful of targeted fixes would put this page ahead of most competitors in its niche.',
    c: 'Readable by AI crawlers, but not shaped to be quoted. The answerability and structured-data gaps are costing you citations.',
    d: 'Significant gaps. Assistants can reach this page but struggle to extract a confident answer from it.',
    f: 'This page is effectively invisible to AI search. The failures below are foundational, not cosmetic.',
  },

  warnings: {
    fetchFailed: (error: string) => `The page could not be fetched: ${error}`,
    httpStatus: (status: number) => `The page responded with HTTP ${status}.`,
    suiteFailed: (message: string) => `A check suite failed and was skipped: ${message}`,
    timeout: (ms: number) => `Timed out after ${ms} ms`,
  },

  errors: {
    empty: 'Enter a URL to scan.',
    invalid: (input: string) => `"${input}" is not a valid URL.`,
    protocol: 'Only http:// and https:// URLs can be scanned.',
    privateHost: 'Private and local hosts cannot be scanned.',
    fullDomain: 'Enter a full public domain, e.g. example.com.',
    privateIp: 'Private network addresses cannot be scanned.',
    unresolvable: (host: string) => `Could not resolve "${host}". Check the domain and try again.`,
    resolvesPrivate: 'That hostname resolves to a private address.',
  },

  checks: {
    robotsPresent: {
      title: 'robots.txt is reachable',
      ok: (groups: number) => `robots.txt found with ${groups} user-agent group(s).`,
      missing:
        'No usable robots.txt. Crawlers fall back to "allow everything", which works but leaves you no control.',
      sitemaps: (count: number) => `Declares ${count} sitemap(s)`,
      fix: (origin: string) =>
        `Publish /robots.txt so AI access is an explicit decision rather than a default:\n\nUser-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`,
    },
    retrievalBots: {
      title: 'Live retrieval agents can fetch this page',
      ok: (total: number) =>
        `All ${total} live-retrieval agents (ChatGPT-User, Claude-User, Perplexity-User and others) are allowed.`,
      blocked: (blocked: number, total: number, names: string) =>
        `${blocked} of ${total} live-retrieval agents are blocked: ${names}. This page cannot appear in their answers.`,
      evidence: (name: string, rule: string, group: string) =>
        `${name} blocked by "${rule}" in group "User-agent: ${group}"`,
      fix: (names: string[]) =>
        `Add explicit allow groups above your wildcard rules in /robots.txt. Retrieval agents fetch a page only because a user asked something it answers, so blocking them removes you from the answer, not from training:\n\n${allowSnippet(names)}`,
    },
    indexingBots: {
      title: 'AI search indexers can crawl this page',
      ok: (total: number) => `All ${total} answer-engine indexers are allowed.`,
      blocked: (names: string) =>
        `Blocked indexers: ${names}. You will not show up in their sources list.`,
      evidence: (name: string, rule: string) => `${name} blocked by "${rule}"`,
      fix: (names: string[]) =>
        `These crawlers build the index answer engines cite from. Allow them explicitly:\n\n${allowSnippet(names)}`,
    },
    trainingBots: {
      title: 'Training-crawler policy is deliberate',
      ok: 'All training crawlers are allowed, which maximises long-term brand presence inside the models themselves.',
      blocked: (count: number, names: string) =>
        `${count} training crawler(s) blocked (${names}). That is a legitimate licensing stance as long as it is intentional.`,
      state: (name: string, allowed: boolean) => `${name}: ${allowed ? 'allowed' : 'blocked'}`,
      fix: 'If this block was accidental, it usually comes from a broad wildcard group. It also keeps you out of the model weights that answer questions offline, where no citation opportunity exists at all.',
    },
    pageOptOut: {
      title: 'No page-level noindex or noai directive',
      noindex: 'This page carries a noindex directive, so it is invisible to every search and answer engine.',
      noai: 'A noai/noimageai directive asks AI systems not to use this content.',
      ok: 'No directive is suppressing this page.',
      meta: (value: string) => `meta robots: ${value}`,
      noMeta: 'No meta robots tag',
      header: (value: string) => `X-Robots-Tag: ${value}`,
      noHeader: 'No X-Robots-Tag header',
      fixNoindex:
        'Remove `noindex` from both the meta robots tag and the X-Robots-Tag response header. This one directive cancels every other optimisation on the page.',
      fixNoai: 'Drop `noai` if you want assistants to quote this page; keep it if the opt-out is deliberate.',
    },

    serverRendered: {
      title: 'Content is present without running JavaScript',
      ok: (words: number) => `${words} words are readable directly from the HTML response.`,
      thin: (words: number) => `Only ${words} words are server-rendered. Thin pages rarely get quoted.`,
      empty: (words: number) =>
        `Almost nothing is server-rendered (${words} words). AI crawlers see an empty page.`,
      words: (count: number) => `${count} words of visible text in the raw HTML`,
      size: (kb: string) => `${kb} KB of HTML returned`,
      fix: 'Render the main content on the server. In Next.js keep it in a Server Component (no `use client` above it); in Nuxt use SSR or `nuxt generate`; in a pure SPA prerender routes for crawlers. Verify with `curl -s <url>` — whatever you cannot see there, no AI crawler can either.',
    },
    clientShell: {
      title: 'No empty client-rendered shell',
      fail: (selectors: string) =>
        `Found an empty mount point (${selectors}) that JavaScript fills in at runtime.`,
      ok: 'No empty client-side mount point detected.',
      empty: (selector: string) => `${selector} is present but contains no text`,
      scripts: (count: number) => `${count} external script tag(s) on the page`,
      fix: 'This is the single most expensive AI-visibility bug: the crawler receives an empty container and moves on. Move rendering to the server, or prerender each route to static HTML at build time.',
    },
    llmsTxt: {
      title: 'llms.txt gives assistants a curated map of the site',
      ok: 'A well-formed /llms.txt is published.',
      malformed: '/llms.txt exists but does not follow the expected Markdown structure.',
      missing: 'No /llms.txt. Assistants have to guess which pages matter.',
      lines: (count: number) => `${count} lines`,
      fix: (host: string, origin: string) =>
        `Publish /llms.txt as static Markdown pointing at the pages you want quoted:\n\n# ${host}\n\n> One-sentence description of what this site is.\n\n## Docs\n- [Getting started](${origin}/docs/start): what it covers\n- [Pricing](${origin}/pricing): plans and limits`,
    },
    sitemap: {
      title: 'A valid XML sitemap is reachable',
      ok: (count: number) => `Sitemap found with ${count} URL entries.`,
      missing: 'No valid XML sitemap was found, so indexers must discover pages by following links.',
      fix: (origin: string) =>
        `Generate /sitemap.xml with <lastmod> dates and declare it in robots.txt:\n\nSitemap: ${origin}/sitemap.xml`,
    },
    textRatio: {
      title: 'HTML is mostly content, not markup noise',
      summary: (percent: string) => `${percent}% of the response is readable text.`,
      text: (count: string) => `${count} characters of text`,
      html: (count: string) => `${count} characters of HTML`,
      fix: 'Extraction pipelines truncate long documents before the model sees them, so heavy markup pushes your content out of the window. Move inline styles and large JSON blobs out of the document and trim wrapper elements.',
    },

    jsonLd: {
      title: 'JSON-LD structured data is present and valid',
      parseError: (count: number) =>
        `Structured data is present but ${count} block(s) failed to parse, so it is ignored entirely.`,
      ok: (types: string) => `Declares ${types}.`,
      missing: 'No meaningful JSON-LD found. Models have to infer what this page is about from prose alone.',
      entities: (count: number) => `${count} schema.org entities found`,
      types: (list: string) => `Types: ${list}`,
      invalidBlock: (index: number) => `Block #${index} is not valid JSON`,
      fix: 'Add a JSON-LD block in <head>. It is the cheapest way to tell a model exactly who you are:\n\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "Page title",\n  "author": { "@type": "Person", "name": "Author name" },\n  "datePublished": "2026-01-15",\n  "dateModified": "2026-09-01",\n  "publisher": { "@type": "Organization", "name": "Your company" }\n}\n</script>',
    },
    authorship: {
      title: 'Authorship is machine-readable',
      ok: 'An author is declared in structured data.',
      metaOnly: 'Author information exists only in meta tags, which is a weaker signal.',
      missing: 'No author information. Anonymous content is deprioritised as a citation source.',
      jsonLd: (present: string) => `JSON-LD author property: ${present}`,
      meta: (present: string) => `Author meta tag or microdata: ${present}`,
      fix: 'Add an `author` property to your Article/BlogPosting JSON-LD, pointing at a Person with a `url` to a real bio page. Answer engines weigh identifiable expertise heavily when two sources are equally relevant.',
    },
    freshness: {
      title: 'Publication and update dates are exposed',
      ok: 'Both datePublished and dateModified are declared.',
      partial: 'Only one of datePublished / dateModified is present.',
      missing: 'No machine-readable dates. For time-sensitive questions, undated content loses to dated content.',
      published: (value: string) => `datePublished: ${value}`,
      modified: (value: string) => `dateModified: ${value}`,
      header: (value: string) => `Last-Modified header: ${value}`,
      fix: 'Emit ISO-8601 `datePublished` and `dateModified` in JSON-LD and keep `dateModified` honest on every edit. Assistants filter for recency whenever a question implies "current".',
    },
    faqSchema: {
      title: 'Question-and-answer schema is used where it fits',
      ok: (types: string) => `Answer-shaped schema present: ${types}.`,
      missing: 'No FAQPage or HowTo schema. Q&A markup is the format answer engines lift most directly.',
      detected: (types: string) => `Detected types: ${types}`,
      fix: 'Where the page answers discrete questions, wrap them in FAQPage markup so each pair can be extracted verbatim:\n\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "How much does it cost?",\n    "acceptedAnswer": { "@type": "Answer", "text": "Plans start at $7/month." }\n  }]\n}',
    },

    headings: {
      title: 'Headings form a clean, chunkable outline',
      noH1: 'No H1 at all, so there is no unambiguous title for the page.',
      manyH1: (count: number) => `${count} H1 elements compete for the page topic.`,
      fewH2: 'One H1 but almost no H2 sections, so the page is a single undifferentiated block.',
      ok: (h2: number) => `Clean outline: 1 H1 and ${h2} H2 sections.`,
      counts: (h1: number, h2: number, h3: number) => `H1: ${h1}, H2: ${h2}, H3: ${h3}`,
      fix: 'Retrieval pipelines split pages into chunks at heading boundaries before embedding them. Use exactly one H1 for the page topic and an H2 per self-contained sub-answer, so each chunk stays meaningful on its own.',
    },
    questionHeadings: {
      title: 'Headings match how people actually ask',
      ok: (questions: number, total: number) =>
        `${questions} of ${total} headings are phrased as questions or direct queries.`,
      none: 'No question-shaped headings. Nothing on the page lines up with a natural-language prompt.',
      fix: 'Rewrite section headings as the question a user would type, then answer it in the first two sentences below. "Pricing" becomes "How much does X cost?" — semantic match against the prompt is what gets the chunk retrieved.',
    },
    formatting: {
      title: 'Facts are formatted as lists or tables',
      ok: (items: number, tables: number) =>
        `${items} list items and ${tables} table(s) give models something to lift directly.`,
      prose: 'Content is almost entirely prose, which is harder to quote accurately.',
      items: (count: number) => `${count} list items`,
      tables: (count: number) => `${count} tables`,
      fix: 'Convert comparisons, steps and specifications into real <ul>/<ol>/<table> markup. Structured fragments survive chunking intact and are reproduced with far fewer invented details than paragraphs.',
    },
    paragraphs: {
      title: 'Paragraphs are short enough to quote',
      none: 'No substantive paragraphs were found in the server HTML.',
      summary: (average: number, count: number) =>
        `Average paragraph length is ${average} words across ${count} paragraphs.`,
      analysed: (count: number) => `${count} paragraphs analysed`,
      fix: 'Keep paragraphs under roughly 80 words and put the claim in the first sentence. Long paragraphs get split mid-argument during chunking, and the half that gets retrieved often loses the conclusion.',
    },
    depth: {
      title: 'The page has enough substance to be a source',
      summary: (words: number) => `${words} words of readable content.`,
      words: (count: number) => `${count} words`,
      sentences: (count: number) => `about ${count} sentences`,
      fix: 'Thin pages are rarely selected as citations because they offer no unique facts. Add original data, examples or numbers a model cannot get from three other sources.',
    },
    semanticHtml: {
      title: 'Main content sits in semantic containers',
      ok: 'Content is wrapped in <main> or <article>.',
      missing: 'No <main> or <article> element, so boilerplate and content are indistinguishable.',
      fix: 'Wrap the body copy in <main> or <article> and keep navigation inside <nav>/<footer>. Readability extractors use these landmarks to strip boilerplate — without them, your menu can end up in the extracted content.',
    },

    titleTag: {
      title: 'Title tag is descriptive and well-sized',
      missing: 'No title tag. The page has no name to be cited under.',
      summary: (length: number, text: string) => `Title is ${length} characters: "${text}".`,
      fix: 'Write a 15–65 character title that states the specific claim of the page, front-loading the entity name. This string is what an assistant prints as the link text when it cites you.',
    },
    metaDescription: {
      title: 'Meta description summarises the answer',
      missing: 'No meta description.',
      summary: (length: number) => `Description is ${length} characters.`,
      fix: 'Write a 70–175 character description that answers the page question in one sentence. Retrieval systems often use it as the page-level summary when ranking candidate sources.',
    },
    canonical: {
      title: 'Canonical URL is present and consistent',
      ok: 'A same-origin canonical URL is declared.',
      crossOrigin: (url: string) => `Canonical points to a different origin: ${url}`,
      missing: 'No canonical URL, so duplicate variants of this page compete with each other.',
      finalUrl: (url: string) => `Final URL: ${url}`,
      fix: (url: string) =>
        `Add <link rel="canonical" href="${url}"> so citation authority consolidates on one address instead of splitting across parameter and trailing-slash variants.`,
    },
    openGraph: {
      title: 'Open Graph metadata is complete',
      summary: (present: number, total: number) => `${present} of ${total} core Open Graph tags present.`,
      tag: (tag: string, present: boolean) => `${tag}: ${present ? 'present' : 'missing'}`,
      fix: 'Add og:title, og:description, og:url and og:image. Several assistants render link cards from these tags when they surface a source, and a bare URL gets clicked far less.',
    },
    language: {
      title: 'Document language is declared',
      ok: (lang: string) => `Declared language: ${lang}.`,
      missing: 'No lang attribute on <html>.',
      fix: 'Set <html lang="en"> (or your actual locale). Language routing decides whether your page is even considered for a query in that language.',
    },

    httpStatus: {
      title: 'The page returns a successful response',
      ok: (status: number, url: string) => `HTTP ${status} from ${url}.`,
      error: (message: string) => `Request failed: ${message}`,
      bad: (status: number) => `HTTP ${status} — crawlers will drop this page.`,
      status: (status: string) => `Status: ${status}`,
      contentType: (type: string) => `Content-Type: ${type}`,
      noResponse: 'no response',
      unknown: 'unknown',
      fix: 'Make sure the URL responds with 200 to an anonymous request. Bot-protection layers (aggressive WAF rules, "under attack" modes) often return 403 to AI crawlers while a normal browser sees the page fine.',
    },
    https: {
      title: 'Served over HTTPS',
      ok: 'The page is served over HTTPS.',
      fail: 'The page is served over plain HTTP.',
      fix: 'Serve the site over HTTPS and 301-redirect HTTP to it. Several crawlers skip insecure origins outright.',
    },
    responseTime: {
      title: 'Server responds quickly',
      summary: (ms: number) => `Full response took ${ms} ms.`,
      evidence: (ms: number) => `${ms} ms from request to full body`,
      fix: 'Live retrieval agents work under a hard latency budget while a user waits for an answer. Slow pages get dropped from the candidate set even when they are the best source. Cache HTML at the edge and keep server work off the critical path.',
    },
    redirects: {
      title: 'Reaching the page takes few redirects',
      none: 'No redirects.',
      summary: (hops: number) => `${hops} redirect hop(s) before the final URL.`,
      hops: (count: number) => `${count} hop(s)`,
      requested: (url: string) => `Requested: ${url}`,
      final: (url: string) => `Final: ${url}`,
      fix: 'Collapse redirect chains to a single hop. Some crawlers stop following after two, and every hop adds latency to a time-boxed fetch.',
    },
    htmlWeight: {
      title: 'HTML payload is a reasonable size',
      summary: (kb: string) => `${kb} KB of HTML.`,
      fix: 'Trim the document. Extraction pipelines truncate oversized pages, and the tail — often your conclusion — is what gets cut.',
    },
    imageAlt: {
      title: 'Images carry descriptive alt text',
      noImages: 'No images on the page.',
      summary: (withAlt: number, total: number, percent: number) =>
        `${withAlt} of ${total} images have alt text (${percent}%).`,
      images: (count: number) => `${count} images`,
      withAlt: (count: number) => `${count} with non-empty alt`,
      fix: 'Describe what each informative image shows. Alt text is the only part of an image that reaches a text-only crawler, and charts or screenshots often carry the data worth citing.',
    },
  },
};

/** Widens string literals to `string` so translations can use their own wording. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { [K in keyof T]: Widen<T[K]> };

export type AuditMessages = Widen<typeof auditEn>;
