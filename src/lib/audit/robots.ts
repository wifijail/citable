/**
 * A robots.txt parser with the matching semantics real crawlers use
 * (Google's Robots Exclusion Protocol / RFC 9309):
 *
 *  - consecutive `User-agent` lines form one group sharing the rules below them;
 *  - a crawler obeys the group whose agent token is the *longest* case-insensitive
 *    prefix of its product token, falling back to the `*` group;
 *  - within a group the *longest matching path pattern* wins, `Allow` breaking ties;
 *  - `*` matches any run of characters and `$` anchors the end of the path.
 *
 * This is the piece most naive "AI SEO" checkers get wrong — they grep for the bot
 * name and miss the wildcard group that is actually blocking it.
 */

export type RuleType = 'allow' | 'disallow';

export interface RobotsRule {
  type: RuleType;
  /** Raw pattern as written in the file. */
  pattern: string;
  /** Original line, for evidence in the report. */
  raw: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
  /** Lines we could not interpret — surfaced as a warning in the report. */
  unknownDirectives: string[];
  isEmpty: boolean;
}

export interface RobotsDecision {
  allowed: boolean;
  /** The deciding line, or null when nothing matched (default allow). */
  rule: string | null;
  /** Which `User-agent` group decided it. */
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
          current = { agents: [], rules: [] };
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
          current = { agents: ['*'], rules: [] };
          groups.push(current);
        }
        acceptingAgents = false;
        current.rules.push({ type: directive, pattern: value, raw: line });
        break;
      }
      case 'sitemap': {
        if (value) sitemaps.push(value);
        break;
      }
      case 'crawl-delay':
      case 'host':
      case 'noindex':
      case 'clean-param':
        // Known but irrelevant to access decisions.
        break;
      default:
        unknownDirectives.push(line);
    }
  }

  return {
    groups,
    sitemaps,
    unknownDirectives,
    isEmpty: meaningfulLines === 0,
  };
}

/** Selects the group a crawler must obey, mirroring longest-token-match. */
function selectGroup(parsed: ParsedRobots, agent: string): { group: RobotsGroup; token: string } | null {
  const needle = agent.toLowerCase();
  let best: { group: RobotsGroup; token: string } | null = null;

  for (const group of parsed.groups) {
    for (const token of group.agents) {
      if (token === '*') {
        if (!best) best = { group, token };
        continue;
      }
      if (!needle.startsWith(token)) continue;
      if (!best || best.token === '*' || token.length > best.token.length) {
        best = { group, token };
      }
    }
  }

  // A wildcard group only applies when no specific group matched.
  if (best && best.token === '*') {
    const specific = parsed.groups.some((g) =>
      g.agents.some((t) => t !== '*' && needle.startsWith(t)),
    );
    if (specific) return null;
  }
  return best;
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

/** Effective length used for specificity, ignoring the wildcard/anchor glyphs. */
function specificity(pattern: string): number {
  return pattern.replace(/\$$/, '').length;
}

export function isAllowed(parsed: ParsedRobots, agent: string, path: string): RobotsDecision {
  if (parsed.isEmpty) {
    return { allowed: true, rule: null, matchedGroup: null };
  }

  const selected = selectGroup(parsed, agent);
  if (!selected) {
    return { allowed: true, rule: null, matchedGroup: null };
  }

  const target = path.startsWith('/') ? path : `/${path}`;
  let winner: RobotsRule | null = null;

  for (const rule of selected.group.rules) {
    // `Disallow:` with an empty value explicitly allows everything.
    if (rule.pattern === '') {
      if (rule.type === 'disallow' && !winner) {
        winner = { type: 'allow', pattern: '', raw: rule.raw };
      }
      continue;
    }
    if (!patternToRegExp(rule.pattern).test(target)) continue;

    if (!winner || winner.pattern === '') {
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
    rule: winner && winner.pattern !== '' ? winner.raw : null,
    matchedGroup: selected.token,
  };
}
