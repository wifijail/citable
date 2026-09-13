/**
 * The AI agent registry — the part of Citable that has to stay current.
 *
 * `purpose` matters more than the vendor name when explaining results:
 *   - retrieval: fetches a page *while answering a user*. Blocking it means you can
 *     never be cited in a live answer. This is the expensive mistake.
 *   - indexing:  builds the search index those answers are grounded in.
 *   - training:  collects corpora for model training. Blocking it is a legitimate
 *     business choice and is scored far more softly.
 *
 * Human-readable notes per agent live in the audit dictionaries (`crawlerNotes`).
 */

export interface AiCrawler {
  id: string;
  /** Product token as it appears in robots.txt. */
  name: string;
  vendor: string;
  purpose: 'training' | 'retrieval' | 'indexing';
  /** Share of the crawler-access score. Retrieval bots dominate on purpose. */
  weight: number;
}

export const AI_CRAWLERS: readonly AiCrawler[] = [
  { id: 'oai-searchbot', name: 'OAI-SearchBot', vendor: 'OpenAI', purpose: 'indexing', weight: 10 },
  { id: 'chatgpt-user', name: 'ChatGPT-User', vendor: 'OpenAI', purpose: 'retrieval', weight: 10 },
  { id: 'gptbot', name: 'GPTBot', vendor: 'OpenAI', purpose: 'training', weight: 3 },
  { id: 'claudebot', name: 'ClaudeBot', vendor: 'Anthropic', purpose: 'training', weight: 3 },
  { id: 'claude-user', name: 'Claude-User', vendor: 'Anthropic', purpose: 'retrieval', weight: 9 },
  { id: 'claude-searchbot', name: 'Claude-SearchBot', vendor: 'Anthropic', purpose: 'indexing', weight: 8 },
  { id: 'perplexitybot', name: 'PerplexityBot', vendor: 'Perplexity', purpose: 'indexing', weight: 9 },
  { id: 'perplexity-user', name: 'Perplexity-User', vendor: 'Perplexity', purpose: 'retrieval', weight: 8 },
  { id: 'google-extended', name: 'Google-Extended', vendor: 'Google', purpose: 'training', weight: 6 },
  { id: 'googlebot', name: 'Googlebot', vendor: 'Google', purpose: 'indexing', weight: 10 },
  { id: 'bingbot', name: 'Bingbot', vendor: 'Microsoft', purpose: 'indexing', weight: 8 },
  { id: 'applebot-extended', name: 'Applebot-Extended', vendor: 'Apple', purpose: 'training', weight: 3 },
  { id: 'meta-externalagent', name: 'meta-externalagent', vendor: 'Meta', purpose: 'training', weight: 3 },
  { id: 'amazonbot', name: 'Amazonbot', vendor: 'Amazon', purpose: 'retrieval', weight: 4 },
  { id: 'ccbot', name: 'CCBot', vendor: 'Common Crawl', purpose: 'training', weight: 3 },
  { id: 'duckassistbot', name: 'DuckAssistBot', vendor: 'DuckDuckGo', purpose: 'retrieval', weight: 3 },
] as const;

export type CrawlerId = (typeof AI_CRAWLERS)[number]['id'];
