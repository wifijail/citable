import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { AuditMessages } from '@/i18n/audit/en';
import type { FetchedResource, PageSnapshot } from './types';

const USER_AGENT =
  'CitableBot/1.0 (+https://github.com/wifijail/citable; AI visibility auditor; respects robots.txt)';

const MAX_BODY_BYTES = 3_000_000; // 3 MB is far beyond any sane HTML document.

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
  | 'resolvesPrivate';

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
 * that points back into private infrastructure (SSRF guard).
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

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
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

/** Single HTTP GET that never throws — failures come back as `ok: false`. */
export async function fetchResource(url: string, accept: string): Promise<FetchedResource> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs());

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept },
      cache: 'no-store',
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const buffer = await response.arrayBuffer();
    const body = new TextDecoder('utf-8', { fatal: false }).decode(
      buffer.byteLength > MAX_BODY_BYTES ? buffer.slice(0, MAX_BODY_BYTES) : buffer,
    );

    return {
      url: response.url || url,
      ok: response.ok,
      status: response.status,
      headers,
      body,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : error instanceof Error
          ? error.message
          : 'network error';
    return {
      url,
      ok: false,
      status: 0,
      headers: {},
      body: '',
      elapsedMs: Date.now() - startedAt,
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Follows redirects manually just to count them — cheap signal, no body needed. */
async function countRedirects(url: string): Promise<number> {
  let hops = 0;
  let current = url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), fetchTimeoutMs());

  try {
    while (hops < 6) {
      const response = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT },
        cache: 'no-store',
      });
      const location = response.headers.get('location');
      if (response.status < 300 || response.status >= 400 || !location) break;
      current = new URL(location, current).toString();
      hops++;
    }
  } catch {
    // Redirect counting is a nice-to-have; never fail the audit over it.
  } finally {
    clearTimeout(timer);
  }
  return hops;
}

/**
 * Collects everything the checks need in one pass: the page, robots.txt,
 * llms.txt and the sitemap are fetched concurrently.
 */
export async function fetchTarget(rawUrl: string): Promise<PageSnapshot> {
  const url = await assertPublicUrl(rawUrl);
  const origin = url.origin;

  const [page, robots, llmsTxt, redirectChainLength] = await Promise.all([
    fetchResource(url.toString(), 'text/html,application/xhtml+xml'),
    fetchResource(`${origin}/robots.txt`, 'text/plain'),
    fetchResource(`${origin}/llms.txt`, 'text/plain'),
    countRedirects(url.toString()),
  ]);

  // Prefer the sitemap robots.txt declares; fall back to the conventional path.
  const declaredSitemap = /^\s*sitemap\s*:\s*(\S+)/im.exec(robots.ok ? robots.body : '')?.[1];
  const sitemapUrl = declaredSitemap ?? `${origin}/sitemap.xml`;
  const sitemap = await fetchResource(sitemapUrl, 'application/xml,text/xml');

  return {
    requestedUrl: url.toString(),
    finalUrl: page.url || url.toString(),
    origin,
    page,
    robots: robots.status > 0 ? robots : null,
    llmsTxt,
    sitemap,
    redirectChainLength,
  };
}
