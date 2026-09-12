import { describe, expect, it } from 'vitest';
import { isAllowed, parseRobots } from '@/lib/audit/robots';

describe('parseRobots', () => {
  it('groups consecutive user-agent lines together', () => {
    const parsed = parseRobots(`
User-agent: GPTBot
User-agent: ClaudeBot
Disallow: /private

User-agent: *
Allow: /
`);
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[0]?.agents).toEqual(['gptbot', 'claudebot']);
    expect(parsed.groups[1]?.agents).toEqual(['*']);
  });

  it('collects sitemaps and ignores comments', () => {
    const parsed = parseRobots(`
# a comment
Sitemap: https://example.com/sitemap.xml
User-agent: *
Disallow: # trailing comment
`);
    expect(parsed.sitemaps).toEqual(['https://example.com/sitemap.xml']);
    expect(parsed.isEmpty).toBe(false);
  });

  it('treats a blank file as empty', () => {
    expect(parseRobots('   \n\n# only comments\n').isEmpty).toBe(true);
  });
});

describe('isAllowed', () => {
  it('allows everything when robots.txt is empty', () => {
    const parsed = parseRobots('');
    expect(isAllowed(parsed, 'GPTBot', '/anything').allowed).toBe(true);
  });

  it('applies the wildcard group when no specific group matches', () => {
    const parsed = parseRobots('User-agent: *\nDisallow: /');
    const decision = isAllowed(parsed, 'ChatGPT-User', '/pricing');
    expect(decision.allowed).toBe(false);
    expect(decision.matchedGroup).toBe('*');
  });

  it('prefers a specific group over the wildcard group', () => {
    // The mistake this product exists to catch: a broad block plus a narrow allow.
    const parsed = parseRobots(`
User-agent: *
Disallow: /

User-agent: ChatGPT-User
Allow: /
`);
    expect(isAllowed(parsed, 'ChatGPT-User', '/pricing').allowed).toBe(true);
    expect(isAllowed(parsed, 'PerplexityBot', '/pricing').allowed).toBe(false);
  });

  it('lets the longest matching pattern win, with Allow breaking ties', () => {
    const parsed = parseRobots(`
User-agent: *
Disallow: /blog
Allow: /blog/public
`);
    expect(isAllowed(parsed, 'GPTBot', '/blog/secret').allowed).toBe(false);
    expect(isAllowed(parsed, 'GPTBot', '/blog/public/post').allowed).toBe(true);
  });

  it('treats an empty Disallow as allow-all', () => {
    const parsed = parseRobots('User-agent: *\nDisallow:');
    expect(isAllowed(parsed, 'ClaudeBot', '/anything').allowed).toBe(true);
  });

  it('supports * wildcards inside patterns', () => {
    const parsed = parseRobots('User-agent: *\nDisallow: /*.pdf');
    expect(isAllowed(parsed, 'GPTBot', '/files/report.pdf').allowed).toBe(false);
    expect(isAllowed(parsed, 'GPTBot', '/files/report.html').allowed).toBe(true);
  });

  it('honours the $ end anchor', () => {
    const parsed = parseRobots('User-agent: *\nDisallow: /page$');
    expect(isAllowed(parsed, 'GPTBot', '/page').allowed).toBe(false);
    expect(isAllowed(parsed, 'GPTBot', '/page/sub').allowed).toBe(true);
  });

  it('matches agent tokens case-insensitively by prefix', () => {
    const parsed = parseRobots('user-agent: gptbot\ndisallow: /');
    expect(isAllowed(parsed, 'GPTBot/1.2', '/').allowed).toBe(false);
  });

  it('reports the deciding rule for the report evidence', () => {
    const parsed = parseRobots('User-agent: PerplexityBot\nDisallow: /docs');
    const decision = isAllowed(parsed, 'PerplexityBot', '/docs/intro');
    expect(decision.allowed).toBe(false);
    expect(decision.rule).toBe('Disallow: /docs');
    expect(decision.matchedGroup).toBe('perplexitybot');
  });
});
