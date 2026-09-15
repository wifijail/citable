import { sharedTerms, extractTopics } from '../topics';
import type { CheckContext, CheckResult } from '../types';

/** Link patterns for trust pages, in the five supported languages. */
const TRUST_PATTERNS = {
  about: /(about|company|team|о-нас|о-компании|about-us|biz-turaly|біз-туралы|sobre|quienes-somos|ueber-uns|uber-uns|impressum)|^(о нас|о компании|about|about us|біз туралы|sobre nosotros|über uns|impressum)$/i,
  contact: /(contact|kontakt|контакт|байланыс|contacto)|^(контакты|contacts?|contact us|байланыс|contacto|kontakt)$/i,
  privacy: /(privacy|konfidencial|конфиденциальн|политика-конфиденциальности|құпиялылық|privacidad|datenschutz)|^(политика конфиденциальности|privacy policy|құпиялылық саясаты|política de privacidad|datenschutz)$/i,
} as const;

export function insightChecks(ctx: CheckContext): CheckResult[] {
  const { $, t, text, snapshot } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];

  // --- Title and H1 agree on the subject --------------------------------------
  const title = $('head title').first().text().trim();
  const h1 = $('h1').first().text().trim();
  const topics = extractTopics($, text, 6);

  if (!title || !h1) {
    results.push({
      id: 'topic-focus',
      title: m.topicFocus.title,
      category: 'answerability',
      status: 'info',
      score: 1,
      weight: 0,
      impact: 'low',
      summary: m.topicFocus.noData,
    });
  } else {
    const shared = sharedTerms(title, h1);
    results.push({
      id: 'topic-focus',
      title: m.topicFocus.title,
      category: 'answerability',
      status: shared.length > 0 ? 'pass' : 'warn',
      score: shared.length > 0 ? 1 : 0.4,
      weight: 3,
      impact: 'medium',
      summary: shared.length > 0 ? m.topicFocus.ok(shared.slice(0, 5).join(', ')) : m.topicFocus.mismatch(title.slice(0, 70), h1.slice(0, 70)),
      evidence: topics.length > 0 ? [m.topicFocus.topTerms(topics.map((topic) => topic.term).join(', '))] : undefined,
      fix: shared.length > 0 ? undefined : m.topicFocus.fix,
    });
  }

  // --- Trust pages linked from this page ---------------------------------------
  const found = { about: false, contact: false, privacy: false };
  $('a[href]').each((_, element) => {
    const rawHref = $(element).attr('href') ?? '';
    let href = rawHref.toLowerCase();
    try {
      href = decodeURIComponent(rawHref).toLowerCase();
    } catch {
      // Malformed percent-encoding: match against the raw value.
    }
    const label = $(element).text().trim().toLowerCase();
    for (const key of Object.keys(found) as Array<keyof typeof found>) {
      if (TRUST_PATTERNS[key].test(href) || TRUST_PATTERNS[key].test(label)) found[key] = true;
    }
    if (/^mailto:|^tel:/.test(href)) found.contact = true;
  });
  const missing = (Object.keys(found) as Array<keyof typeof found>).filter((key) => !found[key]);

  results.push({
    id: 'trust-pages',
    title: m.trustPages.title,
    category: 'identity',
    status: missing.length === 0 ? 'pass' : missing.length === 3 ? 'fail' : 'warn',
    score: 1 - missing.length / 3,
    weight: 3,
    impact: 'medium',
    summary: missing.length === 0 ? m.trustPages.ok : m.trustPages.partial(missing.map((key) => m.trustPages.labels[key]).join(', ')),
    fix: missing.length === 0 ? undefined : m.trustPages.fix,
  });

  // --- Cloudflare's network-level AI crawler controls ---------------------------
  const headers = snapshot.page.headers;
  const cloudflare = (headers['server'] ?? '').toLowerCase().includes('cloudflare') || Boolean(headers['cf-ray']);
  if (cloudflare) {
    results.push({
      id: 'cdn-ai-protection',
      title: m.cdnProtection.title,
      category: 'technical',
      status: 'info',
      score: 1,
      weight: 0,
      impact: 'medium',
      summary: m.cdnProtection.detected,
      evidence: [m.cdnProtection.evidence(headers['cf-ray'] ? `cf-ray: ${headers['cf-ray']}` : `server: ${headers['server']}`)],
      fix: m.cdnProtection.fix,
    });
  }

  return results;
}

export function detectCdn(headers: Record<string, string>): string | null {
  const server = (headers['server'] ?? '').toLowerCase();
  if (server.includes('cloudflare') || headers['cf-ray']) return 'Cloudflare';
  if (headers['x-vercel-id'] || server.includes('vercel')) return 'Vercel';
  if (headers['x-amz-cf-id']) return 'Amazon CloudFront';
  if (headers['x-served-by']?.includes('cache-') || headers['x-fastly-request-id']) return 'Fastly';
  if (server.includes('akamai') || headers['x-akamai-transformed']) return 'Akamai';
  if (server.includes('ddos-guard')) return 'DDoS-Guard';
  return null;
}
