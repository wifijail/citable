import { z } from 'zod';
import { ENGINE_IDS, type EngineId } from './crawlers';
import { SITE_TYPES, type ScanOptions } from './types';

import { SITE_PAGE_LIMITS } from './limits';

export { SITE_PAGE_LIMITS };

export const DEFAULT_OPTIONS: ScanOptions = {
  mode: 'page',
  maxPages: SITE_PAGE_LIMITS.free,
  siteType: 'auto',
  engines: [...ENGINE_IDS],
  blockTraining: false,
};

export const ScanOptionsSchema = z
  .object({
    mode: z.enum(['page', 'site']).optional(),
    maxPages: z.number().int().min(1).max(100).optional(),
    siteType: z.enum(['auto', ...SITE_TYPES] as [string, ...string[]]).optional(),
    engines: z.array(z.enum(ENGINE_IDS as [EngineId, ...EngineId[]])).max(ENGINE_IDS.length).optional(),
    blockTraining: z.boolean().optional(),
  })
  .optional();

/** Fills defaults and clamps the page budget to what the plan allows. */
export function resolveOptions(
  input: z.infer<typeof ScanOptionsSchema>,
  plan: keyof typeof SITE_PAGE_LIMITS,
): ScanOptions {
  const limit = SITE_PAGE_LIMITS[plan];
  const engines = input?.engines?.length ? [...new Set(input.engines)] : [...ENGINE_IDS];
  return {
    mode: input?.mode ?? DEFAULT_OPTIONS.mode,
    maxPages: Math.min(input?.maxPages ?? limit, limit),
    siteType: (input?.siteType as ScanOptions['siteType'] | undefined) ?? 'auto',
    engines,
    blockTraining: input?.blockTraining ?? false,
  };
}
