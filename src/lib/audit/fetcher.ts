import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { AuditMessages } from '@/i18n/audit/en';
import { CITABLE_BOT_TOKEN } from './crawlers';
import { isAllowed, parseRobots } from './robots';
import type { FetchedResource, PageSnapshot } from './types';

/**
 * Honest identification: this is an on-demand audit requested by a person, and
 * site owners can opt out with `User-agent: CitableBot` in robots.txt.
 */
export const USER_AGENT = `Mozilla/5.0 (compatible; ${CITABLE_BOT_TOKEN}/2.0; on-demand AI-visibility audit; +https://github.com/wifijail/citable)`;

const MAX_BODY_BYTES = 3_000_000; // 3 MB is far beyond any sane HTML document.
const MAX_REDIRECTS = 5;

export function fetchTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.FETCH_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

export type TargetErrorCode =
  | 'empty'
  | 'invalid'
  | 'protocol'
  | 'privateHost'
  | 'fullDomain'
  | 'privateIp'
  | 'unresolvable'
  | 'resolvesPrivate'
  | 'botDisallowed';

/** Thrown for user-input problems. Carries a code so the API can localise it. */
export class InvalidTargetError extends Error {
  constructor(
    readonly code: TargetErrorCode,
    readonly detail = '',
  ) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.name = 'InvalidTargetError';
  }
}

export function describeTargetError(error: InvalidTargetError, t: AuditMessages): string {
  switch (error.code) {
    case 'empty':
      return t.errors.empty;
    case 'invalid':
      return t.errors.invalid(error.detail);
    case 'protocol':
      return t.errors.protocol;
    case 'privateHost':
      return t.errors.privateHost;
    case 'fullDomain':
      return t.errors.fullDomain;
    case 'privateIp':
      return t.errors.privateIp;
    case 'unresolvable':
      return t.errors.unresolvable(error.detail);
    case 'resolvesPrivate':
      return t.errors.resolvesPrivate;
    case 'botDisallowed':
      return t.errors.botDisallowed;
  }
}

/** Blocks loopback, link-local, private and carrier-grade-NAT ranges. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
    const mapped = /::ffff:(\d+\.\d+\.\d+\.\d+)/.exec(normalized);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return false;
  }

  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return true;
  const [a = 0, b = 0] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/**
 * Normalises user input into a safe, absolute http(s) URL and refuses anything
 * that points into private infrastructure (SSRF guard).
 */
export async function assertPublicUrl(input: string): Promise<URL> {
  const trimmed = input.trim();
  if (!trimmed) throw new InvalidTargetError('empty');

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidTargetError('invalid', input.slice(0, 120));
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidTargetError('protocol');
  }
  if (url.username || url.password) throw new InvalidTargetError('invalid', input.slice(0, 120));

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new InvalidTargetError('privateHost');
  }
  if (!host.includes('.') && isIP(host) === 0) {
    throw new InvalidTargetError('fullDomain');
  }

  if (isIP(host) !== 0) {
    if (isPrivateAddress(host)) throw new InvalidTargetError('privateIp');
    return url;
  }

  let resolved: Array<{ address: string }>;
  try {
    resolved = await lookup(host, { all: true });
  } catch {
    throw new InvalidTargetError('unresolvable', host);
  }
  if (resolved.length === 0) throw new InvalidTargetError('unresolvable', host);
  if (resolved.some((entry) => isPrivateAddress(entry.address))) {
    throw new InvalidTargetError('resolvesPrivate');
  }

  return url;
}

export type Fetcher = (url: string, accept: string, timeoutMs?: number) => Promise<FetchedResource>;

/**
 * HTTP GET that never throws — failures come back as `ok: false`.
 * Redirects are followed by hand so every hop passes the SSRF guard: a public
 * page must not be able to bounce the scanner onto an internal address.
 */
export const fetchResource: Fetcher = async (url, accept, timeoutMs = fetchTimeoutMs()) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let current = url;
  let redirects = 0;

  const failure = (error: string, status = 0): FetchedResource => ({
    url: current,
    ok: false,
    status,
    headers: {},
    body: '',
    elapsedMs: Date.now() - startedAt,
    redirects,
    error,
  });

  try {
    for (;;) {
      if (redirects > 0) {
        try {
          await assertPublicUrl(current);
        } catch {
          return failure('blocked-redirect');
        }
      }

      const response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept },
        cache: 'no-store',
      });

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        if (redirects >= MAX_REDIRECTS) return failure('too-many-redirects', response.status);
        current = new URL(location, current).toString();
        redirects++;
        continue;
      }

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const buffer = await response.arrayBuffer();
      const body = new TextDecoder('utf-8', { fatal: false }).decode(
        buffer.byteLength > MAX_BODY_BYTES ? buffer.slice(0, MAX_BODY_BYTES) : buffer,
      );

      return {
        url: current,
        ok: response.ok,
        status: response.status,
        headers,
        body,
        elapsedMs: Date.now() - startedAt,
        redirects,
      };
    }
  } catch (error) {
    return failure(
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : error instanceof Error
          ? error.message
          : 'network error',
    );
  } finally {
    clearTimeout(timer);
  }
};

/** True when robots.txt contains a group naming CitableBot that disallows the path. */
export function citableBotDisallowed(robotsBody: string, path: string): boolean {
  const parsed = parseRobots(robotsBody);
  const namesUs = parsed.groups.some((group) => group.agents.includes(CITABLE_BOT_TOKEN.toLowerCase()));
  // Only an explicit opt-out counts: auditing wildcard blocks is the point of the tool.
  return namesUs && !isAllowed(parsed, CITABLE_BOT_TOKEN, path).allowed;
}

/**
 * Collects everything the checks need in one pass: robots.txt first (to honour
 * an explicit CitableBot opt-out), then the page, llms.txt and the sitemap.
 */
export async function fetchTarget(rawUrl: string, fetcher: Fetcher = fetchResource): Promise<PageSnapshot> {
  const url = await assertPublicUrl(rawUrl);
  const origin = url.origin;

  const robots = await fetcher(`${origin}/robots.txt`, 'text/plain');
  if (robots.ok && citableBotDisallowed(robots.body, url.pathname || '/')) {
    throw new InvalidTargetError('botDisallowed');
  }

  const [page, llmsTxt] = await Promise.all([
    fetcher(url.toString(), 'text/html,application/xhtml+xml'),
    fetcher(`${origin}/llms.txt`, 'text/plain'),
  ]);

  // Prefer the sitemap robots.txt declares, if it is on the same site; else the conventional path.
  const declared = /^\s*sitemap\s*:\s*(\S+)/im.exec(robots.ok ? robots.body : '')?.[1];
  let sitemapUrl = `${origin}/sitemap.xml`;
  if (declared) {
    try {
      if (new URL(declared, origin).hostname === url.hostname) sitemapUrl = new URL(declared, origin).toString();
    } catch {
      // Ignore a malformed Sitemap line.
    }
  }
  const sitemap = await fetcher(sitemapUrl, 'application/xml,text/xml');

  return {
    requestedUrl: url.toString(),
    finalUrl: page.url || url.toString(),
    origin,
    page,
    robots: robots.status > 0 ? robots : null,
    llmsTxt,
    sitemap,
    redirectChainLength: page.redirects,
  };
}
