import type { CheerioAPI } from 'cheerio';
import { jsonLdTypes } from '../profile';
import type { CheckContext, CheckResult } from '../types';

type Json = Record<string, unknown>;

/** All JSON-LD objects on the page, flattened through @graph and nesting. */
export function jsonLdEntities($: CheerioAPI): Json[] {
  const entities: Json[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const record = value as Json;
    if (record['@type']) entities.push(record);
    for (const nested of Object.values(record)) if (nested && typeof nested === 'object') visit(nested);
  };
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      visit(JSON.parse($(element).text()));
    } catch {
      // Reported elsewhere.
    }
  });
  return entities;
}

function typesOf(entity: Json): string[] {
  const raw = entity['@type'];
  return typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
}

const LOCAL_TYPES = /^(LocalBusiness|Restaurant|Store|Dentist|MedicalClinic|HairSalon|AutoRepair|Hotel|LodgingBusiness|FoodEstablishment|ProfessionalService|LegalService|RealEstateAgent|CafeOrCoffeeShop|BeautySalon|HealthClub)$/;

export function profileChecks(ctx: CheckContext): CheckResult[] {
  const { $, t, profile, pages } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];
  const entities = jsonLdEntities($);
  const pageTypes = new Set([...jsonLdTypes($), ...pages.flatMap((page) => page.jsonLdTypes)]);

  switch (profile.type) {
    case 'ecommerce': {
      const products = entities.filter((entity) => typesOf(entity).includes('Product'));
      const offer = products
        .map((product) => product['offers'])
        .flatMap((offers) => (Array.isArray(offers) ? offers : offers ? [offers] : []))
        .find((value): value is Json => Boolean(value) && typeof value === 'object') as Json | undefined;
      const missing = offer
        ? (['price', 'priceCurrency', 'availability'] as const).filter((field) => offer[field] === undefined && !(field === 'price' && offer['lowPrice'] !== undefined))
        : [];
      const siteHasProduct = pageTypes.has('Product');

      results.push({
        id: 'product-schema',
        title: m.productSchema.title,
        category: 'structured-data',
        status: products.length > 0 && offer && missing.length === 0 ? 'pass' : products.length > 0 || siteHasProduct ? 'warn' : 'fail',
        score: products.length > 0 && offer && missing.length === 0 ? 1 : products.length > 0 || siteHasProduct ? 0.5 : 0,
        weight: 6,
        impact: 'high',
        summary:
          products.length > 0 && offer && missing.length === 0
            ? m.productSchema.ok
            : products.length > 0
              ? m.productSchema.partial(offer ? missing.join(', ') : 'offers')
              : siteHasProduct
                ? m.productSchema.partial('offers')
                : m.productSchema.missing,
        fix: products.length > 0 && offer && missing.length === 0 ? undefined : m.productSchema.fix,
      });

      const hasBreadcrumbs = pageTypes.has('BreadcrumbList');
      results.push({
        id: 'breadcrumbs-schema',
        title: m.breadcrumbs.title,
        category: 'structured-data',
        status: hasBreadcrumbs ? 'pass' : 'warn',
        score: hasBreadcrumbs ? 1 : 0.4,
        weight: 2,
        impact: 'low',
        summary: hasBreadcrumbs ? m.breadcrumbs.ok : m.breadcrumbs.missing,
        fix: hasBreadcrumbs ? undefined : m.breadcrumbs.fix,
      });
      break;
    }

    case 'saas': {
      const hasApp = ['SoftwareApplication', 'WebApplication', 'MobileApplication', 'Product'].some((type) => pageTypes.has(type));
      results.push({
        id: 'software-schema',
        title: m.softwareSchema.title,
        category: 'structured-data',
        status: hasApp ? 'pass' : 'warn',
        score: hasApp ? 1 : 0.4,
        weight: 4,
        impact: 'medium',
        summary: hasApp ? m.softwareSchema.ok : m.softwareSchema.missing,
        fix: hasApp ? undefined : m.softwareSchema.fix,
      });

      const pricingPattern = /\/(pricing|plans|prices?|tarif\w*|ceny|precios|preise)(\/|$)/i;
      const linked = $('a[href]')
        .map((_, element) => $(element).attr('href') ?? '')
        .get()
        .find((href) => {
          try {
            return pricingPattern.test(new URL(href, ctx.snapshot.finalUrl).pathname);
          } catch {
            return false;
          }
        });
      const onPricingPage = pricingPattern.test(new URL(ctx.snapshot.finalUrl).pathname);
      const crawled = pages.find((page) => pricingPattern.test(new URL(page.url).pathname));
      const unreadable = crawled && (crawled.status !== 200 || crawled.wordCount < 50);
      const pricingUrl = crawled?.url ?? (linked ? new URL(linked, ctx.snapshot.finalUrl).toString() : ctx.snapshot.finalUrl);
      const found = Boolean(linked || onPricingPage || crawled);

      results.push({
        id: 'pricing-page',
        title: m.pricingPage.title,
        category: 'answerability',
        status: !found ? 'warn' : unreadable ? 'fail' : 'pass',
        score: !found ? 0.4 : unreadable ? 0.2 : 1,
        weight: 4,
        impact: 'high',
        summary: !found ? m.pricingPage.notLinked : unreadable ? m.pricingPage.unreadable(pricingUrl) : m.pricingPage.ok(pricingUrl),
        fix: !found || unreadable ? m.pricingPage.fix : undefined,
      });
      break;
    }

    case 'blog': {
      const hasArticle = ['Article', 'BlogPosting', 'NewsArticle'].some((type) => pageTypes.has(type));
      results.push({
        id: 'article-schema',
        title: m.articleSchema.title,
        category: 'structured-data',
        status: hasArticle ? 'pass' : 'fail',
        score: hasArticle ? 1 : 0,
        weight: 5,
        impact: 'high',
        summary: hasArticle ? m.articleSchema.ok : m.articleSchema.missing,
        fix: hasArticle ? undefined : m.articleSchema.fix,
      });

      const hasFeed = $('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]').length > 0;
      results.push({
        id: 'feed-link',
        title: m.feedLink.title,
        category: 'machine-readability',
        status: hasFeed ? 'pass' : 'warn',
        score: hasFeed ? 1 : 0.5,
        weight: 2,
        impact: 'low',
        summary: hasFeed ? m.feedLink.ok : m.feedLink.missing,
        fix: hasFeed ? undefined : m.feedLink.fix,
      });
      break;
    }

    case 'local': {
      const business = entities.find((entity) => typesOf(entity).some((type) => LOCAL_TYPES.test(type)));
      const missingFields = business
        ? (['address', 'telephone', 'openingHoursSpecification'] as const).filter(
            (field) => business[field] === undefined && !(field === 'openingHoursSpecification' && business['openingHours'] !== undefined),
          )
        : [];
      results.push({
        id: 'local-business-schema',
        title: m.localBusinessSchema.title,
        category: 'structured-data',
        status: business && missingFields.length === 0 ? 'pass' : business ? 'warn' : 'fail',
        score: business && missingFields.length === 0 ? 1 : business ? 0.5 : 0,
        weight: 6,
        impact: 'high',
        summary: business && missingFields.length === 0 ? m.localBusinessSchema.ok : business ? m.localBusinessSchema.partial(missingFields.join(', ')) : m.localBusinessSchema.missing,
        fix: business && missingFields.length === 0 ? undefined : m.localBusinessSchema.fix,
      });

      const bodyText = ctx.text;
      const hasPhone = $('a[href^="tel:"]').length > 0 || /(\+?\d[\d\s()-]{8,}\d)/.test(bodyText);
      const hasAddress = /\b(street|st\.|avenue|ave\.|road|calle|straße|strasse)\b|ул\.|улица|проспект|пр\.|көшесі|даңғылы|мкр|микрорайон/i.test(bodyText) || $('address').length > 0;
      const missingContact = [!hasPhone && m.contactDetails.labels.phone, !hasAddress && m.contactDetails.labels.address].filter(Boolean) as string[];
      results.push({
        id: 'contact-details',
        title: m.contactDetails.title,
        category: 'identity',
        status: missingContact.length === 0 ? 'pass' : 'warn',
        score: missingContact.length === 0 ? 1 : 0.5,
        weight: 3,
        impact: 'medium',
        summary: missingContact.length === 0 ? m.contactDetails.ok : m.contactDetails.partial(missingContact.join(', ')),
        fix: missingContact.length === 0 ? undefined : m.contactDetails.fix,
      });
      break;
    }

    case 'docs': {
      const codeBlocks = $('pre').filter((_, element) => $(element).text().trim().length > 0).length;
      results.push({
        id: 'code-examples',
        title: m.codeExamples.title,
        category: 'answerability',
        status: codeBlocks > 0 ? 'pass' : 'warn',
        score: codeBlocks > 0 ? 1 : 0.5,
        weight: 3,
        impact: 'medium',
        summary: codeBlocks > 0 ? m.codeExamples.ok(codeBlocks) : m.codeExamples.missing,
        fix: codeBlocks > 0 ? undefined : m.codeExamples.fix,
      });

      const structured = $('h2').length > 0 && $('h3').length > 0;
      results.push({
        id: 'docs-structure',
        title: m.docsStructure.title,
        category: 'answerability',
        status: structured ? 'pass' : 'warn',
        score: structured ? 1 : 0.5,
        weight: 2,
        impact: 'low',
        summary: structured ? m.docsStructure.ok : m.docsStructure.flat,
        fix: structured ? undefined : m.docsStructure.fix,
      });
      break;
    }

    case 'general': {
      const hasIdentity = ['Organization', 'Person', 'WebSite', 'Corporation'].some((type) => pageTypes.has(type));
      results.push({
        id: 'organization-schema',
        title: m.organizationSchema.title,
        category: 'structured-data',
        status: hasIdentity ? 'pass' : 'warn',
        score: hasIdentity ? 1 : 0.4,
        weight: 4,
        impact: 'medium',
        summary: hasIdentity ? m.organizationSchema.ok : m.organizationSchema.missing,
        fix: hasIdentity ? undefined : m.organizationSchema.fix,
      });
      break;
    }
  }

  return results;
}
