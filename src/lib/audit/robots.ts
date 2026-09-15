/**
 * A robots.txt parser with the matching semantics of RFC 9309:
 *
 *  - consecutive `User-agent` lines form one group sharing the rules below them;
 *  - a crawler obeys the groups whose agent token is the *longest* case-insensitive
 *    prefix of its product token, falling back to the `*` groups; several groups
 *    naming the same agent are combined into one;
 *  - the *longest matching path pattern* wins, `Allow` breaking ties;
 *  - `*` matches any run of characters and `$` anchors the end of the path.
 */

export type RuleType = 'allow' | 'disallow';

export interface RobotsRule {
  type: RuleType;
  /** Raw pattern as written in the file. */
  pattern: string;
  /** Normalised line, for evidence in the report and for regenerating the file. */
  raw: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
  /** Non-access lines kept verbatim (Crawl-delay, Host, Clean-param). */
  extras: string[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  /** Lines we could not interpret. */
  unknownDirectives: string[];
  isEmpty: boolean;
}

export interface RobotsDecision {
  allowed: boolean;
  /** The deciding line, or null when nothing matched (default allow). */
  rule: string | null;
  /** Which `User-agent` token decided it. */
  matchedGroup: string | null;
}

const DIRECTIVE_RE = /^([a-zA-Z-]+)\s*:\s*(.*)$/;

export function parseRobots(input: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  const unknownDirectives: string[] = [];

  let current: RobotsGroup | null = null;
  // A new `User-agent` line after rules starts a fresh group; consecutive
  // agent lines keep extending the same one.
  let acceptingAgents = false;
  let meaningfulLines = 0;

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const match = DIRECTIVE_RE.exec(line);
    if (!match) {
      unknownDirectives.push(rawLine.trim());
      continue;
    }

    const directive = (match[1] ?? '').toLowerCase();
    const value = (match[2] ?? '').trim();
    meaningfulLines++;

    switch (directive) {
      case 'user-agent': {
        if (!current || !acceptingAgents) {
          current = { agents: [], rules: [], extras: [] };
          groups.push(current);
          acceptingAgents = true;
        }
        if (value) current.agents.push(value.toLowerCase());
        break;
      }
      case 'allow':
      case 'disallow': {
        if (!current) {
          // Rules before any User-agent line: treat as a wildcard group.
          current = { agents: ['*'], rules: [], extras: [] };
          groups.push(current);
        }
        acceptingAgents = false;
        const type: RuleType = directive;
        current.rules.push({ type, pattern: value, raw: `${type === 'allow' ? 'Allow' : 'Disallow'}: ${value}` });
        break;
      }
      case 'sitemap': {
        if (value) sitemaps.push(value);
        break;
      }
      case 'crawl-delay':
      case 'host':
      case 'clean-param': {
        if (current) {
          acceptingAgents = false;
          current.extras.push(line);
        }
        break;
      }
      default:
        unknownDirectives.push(line);
    }
  }

  return { groups, sitemaps, unknownDirectives, isEmpty: meaningfulLines === 0 };
}

/**
 * The token a crawler obeys (longest matching product-token prefix, else `*`)
 * together with the rules of every group naming that token.
 */
export function selectRules(
  parsed: ParsedRobots,
  agent: string,
): { token: string; rules: RobotsRule[] } | null {
  const needle = agent.toLowerCase();
  let token: string | null = null;

  for (const group of parsed.groups) {
    for (const candidate of group.agents) {
      if (candidate === '*' || !needle.startsWith(candidate)) continue;
      if (!token || candidate.length > token.length) token = candidate;
    }
  }
  if (!token && parsed.groups.some((group) => group.agents.includes('*'))) token = '*';
  if (!token) return null;

  const chosen = token;
  const rules = parsed.groups.filter((group) => group.agents.includes(chosen)).flatMap((group) => group.rules);
  return { token: chosen, rules };
}

/** Translates a robots pattern (`*`, `$`) into an anchored RegExp. */
function patternToRegExp(pattern: string): RegExp {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!;
    if (char === '*') {
      source += '.*';
    } else if (char === '$' && i === pattern.length - 1) {
      source += '$';
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp('^' + source);
}

/** Effective length used for specificity, ignoring the end anchor. */
function specificity(pattern: string): number {
  return pattern.replace(/\$$/, '').length;
}

/** Whether a single rule pattern matches a path. */
export function ruleMatches(rule: RobotsRule, path: string): boolean {
  if (rule.pattern === '') return false;
  return patternToRegExp(rule.pattern).test(path.startsWith('/') ? path : `/${path}`);
}

export function isAllowed(parsed: ParsedRobots, agent: string, path: string): RobotsDecision {
  if (parsed.isEmpty) return { allowed: true, rule: null, matchedGroup: null };

  const selected = selectRules(parsed, agent);
  if (!selected) return { allowed: true, rule: null, matchedGroup: null };

  const target = path.startsWith('/') ? path : `/${path}`;
  let winner: RobotsRule | null = null;

  for (const rule of selected.rules) {
    // An empty `Disallow:` blocks nothing; an empty `Allow:` allows nothing extra.
    if (rule.pattern === '' || !ruleMatches(rule, target)) continue;

    if (!winner) {
      winner = rule;
      continue;
    }
    const currentSpec = specificity(rule.pattern);
    const bestSpec = specificity(winner.pattern);
    if (currentSpec > bestSpec || (currentSpec === bestSpec && rule.type === 'allow')) {
      winner = rule;
    }
  }

  return {
    allowed: winner ? winner.type === 'allow' : true,
    rule: winner ? winner.raw : null,
    matchedGroup: selected.token,
  };
}
