import type { CheerioAPI } from 'cheerio';
import type { ScanOptions, SiteProfile, SiteType } from './types';

/** JSON-LD @type values found anywhere on the page, including @graph members. */
export function jsonLdTypes($: CheerioAPI): string[] {
  const found = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    const type = record['@type'];
    if (typeof type === 'string') found.add(type);
    if (Array.isArray(type)) type.forEach((entry) => typeof entry === 'string' && found.add(entry));
    for (const nested of Object.values(record)) {
      if (nested && typeof nested === 'object') visit(nested);
    }
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      visit(JSON.parse($(element).text()));
    } catch {
      // Invalid blocks are reported by the structured-data checks.
    }
  });
  return [...found];
}

const LOCAL_TYPES = [
  'LocalBusiness',
  'Restaurant',
  'Store',
  'Dentist',
  'MedicalClinic',
  'HairSalon',
  'AutoRepair',
  'Hotel',
  'LodgingBusiness',
  'FoodEstablishment',
  'ProfessionalService',
  'LegalService',
  'RealEstateAgent',
];

/** Multilingual keyword patterns (en, ru, kk, es, de) used as weak signals. */
const PATTERNS: Record<Exclude<SiteType, 'general'>, { text: RegExp; href: RegExp }> = {
  ecommerce: {
    text: /\b(add to cart|add to bag|buy now|in stock|out of stock|checkout)\b|в корзину|купить|в наличии|себетке|сатып алу|añadir al carrito|comprar|in den warenkorb|kaufen/i,
    href: /\/(cart|basket|checkout|product|products|shop|catalog|catalogue|korzina|katalog|tovar)(?=[\/?#\s]|$)/i,
  },
  saas: {
    text: /\b(free trial|sign up|get started|pricing|per month|\/mo|api|dashboard|integrations)\b|тариф|попробовать бесплатно|регистрация|тегін байқап|precios|prueba gratis|kostenlos testen|preise/i,
    href: /\/(pricing|plans|signup|sign-up|register|login|app|dashboard|docs|integrations|tarify|ceny)(?=[\/?#\s]|$)/i,
  },
  blog: {
    text: /\b(read more|min read|posted on|published|comments)\b|читать далее|мин чтения|опубликовано|комментари|толығырақ оқу|leer más|weiterlesen/i,
    href: /\/(blog|news|articles|article|posts|post|stati|novosti|zhurnal|magazine)(?=[\/?#\s]|$)/i,
  },
  local: {
    text: /\b(opening hours|open now|book an appointment|our address|directions)\b|часы работы|режим работы|записаться|наш адрес|как добраться|жұмыс уақыты|мекенжай|horario|dirección|öffnungszeiten|anfahrt/i,
    href: /(maps\.google|google\.[a-z.]+\/maps|yandex\.[a-z]+\/maps|2gis\.|tel:)/i,
  },
  docs: {
    text: /\b(documentation|api reference|getting started|installation|quickstart|sdk)\b|документация|установка|быстрый старт|құжаттама|documentación|dokumentation/i,
    href: /\/(docs|documentation|reference|api|guides|guide|manual|help)(?=[\/?#\s]|$)/i,
  },
};

/**
 * Guesses what kind of site this is from structured data, visible wording and
 * link targets. The guess only changes which extra checks run and which
 * generated JSON-LD template is offered — it never hides a problem.
 */
export function detectProfile($: CheerioAPI, text: string, pageUrl: string, options: ScanOptions): SiteProfile {
  const types = jsonLdTypes($);
  const hrefs = $('a[href]')
    .map((_, element) => $(element).attr('href') ?? '')
    .get()
    .join(' ');
  const sample = text.slice(0, 20_000);
  const scores: Record<SiteType, number> = { saas: 0, ecommerce: 0, blog: 0, local: 0, docs: 0, general: 1 };
  const signals: string[] = [];

  const has = (...names: string[]) => names.some((name) => types.includes(name));
  if (has('Product', 'Offer', 'AggregateOffer')) {
    scores.ecommerce += 5;
    signals.push('schema:Product');
  }
  if (has('SoftwareApplication', 'WebApplication', 'MobileApplication')) {
    scores.saas += 5;
    signals.push('schema:SoftwareApplication');
  }
  if (has('Article', 'BlogPosting', 'NewsArticle')) {
    scores.blog += 4;
    signals.push('schema:Article');
  }
  if (has(...LOCAL_TYPES) || has('PostalAddress')) {
    scores.local += 5;
    signals.push('schema:LocalBusiness');
  }
  if (has('TechArticle', 'APIReference')) {
    scores.docs += 5;
    signals.push('schema:TechArticle');
  }

  for (const [type, pattern] of Object.entries(PATTERNS) as Array<[Exclude<SiteType, 'general'>, { text: RegExp; href: RegExp }]>) {
    const textHits = (sample.match(new RegExp(pattern.text.source, 'gi')) ?? []).length;
    const hrefHits = (hrefs.match(new RegExp(pattern.href.source, 'gi')) ?? []).length;
    if (textHits > 0) {
      scores[type] += Math.min(textHits, 4);
      signals.push(`text:${type}`);
    }
    if (hrefHits > 0) {
      scores[type] += Math.min(hrefHits, 4);
      signals.push(`links:${type}`);
    }
  }

  const priceMatches = sample.match(/(\$|€|£|₸|₽)\s?\d|\d[\d\s.,]*\s?(₸|₽|руб|тг|тенге|usd|eur)\b/gi) ?? [];
  if (priceMatches.length >= 3) {
    scores.ecommerce += 2;
    scores.saas += 1;
    signals.push('text:prices');
  }
  if ($('article').length > 0 && $('time[datetime]').length > 0) {
    scores.blog += 3;
    signals.push('html:article-time');
  }
  if ($('pre code, pre').length >= 3) {
    scores.docs += 3;
    signals.push('html:code-blocks');
  }
  if (/\/(docs|documentation)\//i.test(new URL(pageUrl).pathname)) {
    scores.docs += 4;
    signals.push('url:docs');
  }

  const ranked = (Object.entries(scores) as Array<[SiteType, number]>).sort((a, b) => b[1] - a[1]);
  const [best = ['general', 1] as [SiteType, number], second = ['general', 0] as [SiteType, number]] = ranked;
  const detected: SiteType = best[1] >= 4 ? best[0] : 'general';
  const margin = best[1] - second[1];
  const confidence: SiteProfile['confidence'] =
    detected === 'general' ? 'low' : best[1] >= 8 && margin >= 3 ? 'high' : margin >= 2 ? 'medium' : 'low';

  const overridden = options.siteType !== 'auto';
  return {
    type: overridden ? (options.siteType as SiteType) : detected,
    detected,
    confidence,
    signals: [...new Set(signals)].slice(0, 8),
    overridden,
  };
}
