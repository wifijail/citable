/**
 * The AI agent registry — the part of Citable that has to stay current.
 *
 * `purpose` matters more than the vendor name when explaining results:
 *   - retrieval: fetches a page *while answering a user*. Blocking it means you can
 *     never be cited in a live answer. This is the expensive mistake.
 *   - indexing:  builds the search index those answers are grounded in.
 *   - training:  collects corpora for model training. Blocking it is a legitimate
 *     business choice and is scored far more softly.
 */

export interface AiCrawler {
  id: string;
  /** Product token as it appears in robots.txt. */
  name: string;
  vendor: string;
  purpose: 'training' | 'retrieval' | 'indexing';
  /** Share of the crawler-access score. Retrieval bots dominate on purpose. */
  weight: number;
  note: string;
}

export const AI_CRAWLERS: readonly AiCrawler[] = [
  {
    id: 'oai-searchbot',
    name: 'OAI-SearchBot',
    vendor: 'OpenAI',
    purpose: 'indexing',
    weight: 10,
    note: 'Builds the index behind ChatGPT Search results and citations.',
  },
  {
    id: 'chatgpt-user',
    name: 'ChatGPT-User',
    vendor: 'OpenAI',
    purpose: 'retrieval',
    weight: 10,
    note: 'Fetches your page live when a ChatGPT user asks something it answers.',
  },
  {
    id: 'gptbot',
    name: 'GPTBot',
    vendor: 'OpenAI',
    purpose: 'training',
    weight: 3,
    note: 'Training corpus collection. Blocking this is a defensible choice.',
  },
  {
    id: 'claudebot',
    name: 'ClaudeBot',
    vendor: 'Anthropic',
    purpose: 'training',
    weight: 3,
    note: 'Training corpus collection for Claude.',
  },
  {
    id: 'claude-user',
    name: 'Claude-User',
    vendor: 'Anthropic',
    purpose: 'retrieval',
    weight: 9,
    note: 'Fetches your page live for a Claude user request.',
  },
  {
    id: 'claude-searchbot',
    name: 'Claude-SearchBot',
    vendor: 'Anthropic',
    purpose: 'indexing',
    weight: 8,
    note: 'Indexes pages so Claude can surface and cite them in search.',
  },
  {
    id: 'perplexitybot',
    name: 'PerplexityBot',
    vendor: 'Perplexity',
    purpose: 'indexing',
    weight: 9,
    note: 'Builds the Perplexity index — the primary source of its citations.',
  },
  {
    id: 'perplexity-user',
    name: 'Perplexity-User',
    vendor: 'Perplexity',
    purpose: 'retrieval',
    weight: 8,
    note: 'Live fetch triggered by a Perplexity user action.',
  },
  {
    id: 'google-extended',
    name: 'Google-Extended',
    vendor: 'Google',
    purpose: 'training',
    weight: 6,
    note: 'Controls Gemini grounding and AI Overviews usage without affecting Search rank.',
  },
  {
    id: 'googlebot',
    name: 'Googlebot',
    vendor: 'Google',
    purpose: 'indexing',
    weight: 10,
    note: 'AI Overviews are grounded in the regular Google index — this is mandatory.',
  },
  {
    id: 'bingbot',
    name: 'Bingbot',
    vendor: 'Microsoft',
    purpose: 'indexing',
    weight: 8,
    note: 'Feeds Copilot and several third-party answer engines.',
  },
  {
    id: 'applebot-extended',
    name: 'Applebot-Extended',
    vendor: 'Apple',
    purpose: 'training',
    weight: 3,
    note: 'Apple Intelligence training opt-out token.',
  },
  {
    id: 'meta-externalagent',
    name: 'meta-externalagent',
    vendor: 'Meta',
    purpose: 'training',
    weight: 3,
    note: 'Meta AI crawling and training.',
  },
  {
    id: 'amazonbot',
    name: 'Amazonbot',
    vendor: 'Amazon',
    purpose: 'retrieval',
    weight: 4,
    note: 'Powers Alexa answers and Rufus product responses.',
  },
  {
    id: 'ccbot',
    name: 'CCBot',
    vendor: 'Common Crawl',
    purpose: 'training',
    weight: 3,
    note: 'Common Crawl feeds the majority of open training datasets.',
  },
  {
    id: 'duckassistbot',
    name: 'DuckAssistBot',
    vendor: 'DuckDuckGo',
    purpose: 'retrieval',
    weight: 3,
    note: 'DuckDuckGo AI assist answers.',
  },
] as const;

export const RETRIEVAL_CRAWLERS = AI_CRAWLERS.filter((c) => c.purpose === 'retrieval');
export const INDEXING_CRAWLERS = AI_CRAWLERS.filter((c) => c.purpose === 'indexing');
