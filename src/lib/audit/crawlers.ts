/**
 * The AI agent registry — the part of Citable that has to stay current.
 *
 * `purpose` follows each operator's own documentation:
 *   - retrieval: fetches a page because a user asked the assistant something.
 *   - indexing:  builds the search index an assistant draws answers from.
 *   - training:  collects data that may be used to train models.
 *
 * `docs` links to the operator's page describing the agent, so every claim in
 * the report can be checked. Weights are Citable's own heuristic, not something
 * the operators publish.
 */

export type EngineId =
  | 'openai'
  | 'anthropic'
  | 'perplexity'
  | 'google'
  | 'microsoft'
  | 'apple'
  | 'meta'
  | 'amazon'
  | 'duckduckgo'
  | 'commoncrawl';

export const ENGINES: readonly { id: EngineId; label: string }[] = [
  { id: 'openai', label: 'ChatGPT (OpenAI)' },
  { id: 'google', label: 'Google (Gemini, AI Overviews)' },
  { id: 'anthropic', label: 'Claude (Anthropic)' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'microsoft', label: 'Microsoft Copilot (Bing)' },
  { id: 'apple', label: 'Apple' },
  { id: 'meta', label: 'Meta AI' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'commoncrawl', label: 'Common Crawl' },
];

export const ENGINE_IDS: readonly EngineId[] = ENGINES.map((engine) => engine.id);

export interface AiCrawler {
  id: string;
  /** Product token as it appears in robots.txt. */
  name: string;
  vendor: string;
  engine: EngineId;
  purpose: 'training' | 'retrieval' | 'indexing';
  /** Share of the crawler-access score (Citable heuristic). */
  weight: number;
  /** Operator documentation for this agent. */
  docs: string;
}

const OPENAI_DOCS = 'https://platform.openai.com/docs/bots';
const ANTHROPIC_DOCS =
  'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler';
const PERPLEXITY_DOCS = 'https://docs.perplexity.ai/docs/resources/perplexity-crawlers';
const GOOGLE_DOCS = 'https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers';

export const AI_CRAWLERS: readonly AiCrawler[] = [
  { id: 'oai-searchbot', name: 'OAI-SearchBot', vendor: 'OpenAI', engine: 'openai', purpose: 'indexing', weight: 10, docs: OPENAI_DOCS },
  { id: 'chatgpt-user', name: 'ChatGPT-User', vendor: 'OpenAI', engine: 'openai', purpose: 'retrieval', weight: 10, docs: OPENAI_DOCS },
  { id: 'gptbot', name: 'GPTBot', vendor: 'OpenAI', engine: 'openai', purpose: 'training', weight: 3, docs: OPENAI_DOCS },
  { id: 'claudebot', name: 'ClaudeBot', vendor: 'Anthropic', engine: 'anthropic', purpose: 'training', weight: 3, docs: ANTHROPIC_DOCS },
  { id: 'claude-user', name: 'Claude-User', vendor: 'Anthropic', engine: 'anthropic', purpose: 'retrieval', weight: 9, docs: ANTHROPIC_DOCS },
  { id: 'claude-searchbot', name: 'Claude-SearchBot', vendor: 'Anthropic', engine: 'anthropic', purpose: 'indexing', weight: 8, docs: ANTHROPIC_DOCS },
  { id: 'perplexitybot', name: 'PerplexityBot', vendor: 'Perplexity', engine: 'perplexity', purpose: 'indexing', weight: 9, docs: PERPLEXITY_DOCS },
  { id: 'perplexity-user', name: 'Perplexity-User', vendor: 'Perplexity', engine: 'perplexity', purpose: 'retrieval', weight: 8, docs: PERPLEXITY_DOCS },
  { id: 'google-extended', name: 'Google-Extended', vendor: 'Google', engine: 'google', purpose: 'training', weight: 6, docs: GOOGLE_DOCS },
  { id: 'googlebot', name: 'Googlebot', vendor: 'Google', engine: 'google', purpose: 'indexing', weight: 10, docs: GOOGLE_DOCS },
  { id: 'bingbot', name: 'Bingbot', vendor: 'Microsoft', engine: 'microsoft', purpose: 'indexing', weight: 8, docs: 'https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0' },
  { id: 'applebot-extended', name: 'Applebot-Extended', vendor: 'Apple', engine: 'apple', purpose: 'training', weight: 3, docs: 'https://support.apple.com/en-us/119829' },
  { id: 'meta-externalagent', name: 'meta-externalagent', vendor: 'Meta', engine: 'meta', purpose: 'training', weight: 3, docs: 'https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers' },
  { id: 'amazonbot', name: 'Amazonbot', vendor: 'Amazon', engine: 'amazon', purpose: 'indexing', weight: 4, docs: 'https://developer.amazon.com/amazonbot' },
  { id: 'ccbot', name: 'CCBot', vendor: 'Common Crawl', engine: 'commoncrawl', purpose: 'training', weight: 3, docs: 'https://commoncrawl.org/ccbot' },
  { id: 'duckassistbot', name: 'DuckAssistBot', vendor: 'DuckDuckGo', engine: 'duckduckgo', purpose: 'retrieval', weight: 3, docs: 'https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot' },
] as const;

/** Our own agent token. Site owners can block it with `User-agent: CitableBot`. */
export const CITABLE_BOT_TOKEN = 'CitableBot';
