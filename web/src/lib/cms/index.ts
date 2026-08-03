import type { CmsAdapter } from './adapter';
import { localAdapter } from './local';

/**
 * Indgangen til alt indhold på sitet.
 *
 *   import { cms } from '~/lib/cms';
 *   const rejser = await cms.getEntries({ kind: 'rejse', limit: 6 });
 *
 * Kilden vælges med CMS_SOURCE i .env:
 *   local  (standard) — markdown i src/content
 *   sanity            — Headless CMS
 *
 * Sanity-adapteren importeres dynamisk, så et rent lokalt build aldrig
 * rører netværket.
 */
const source = (import.meta.env.CMS_SOURCE ?? 'local').toLowerCase();

async function resolveAdapter(): Promise<CmsAdapter> {
  if (source === 'sanity') {
    const { sanityAdapter } = await import('./sanity');
    return sanityAdapter;
  }
  return localAdapter;
}

export const cms: CmsAdapter = await resolveAdapter();

export * from './types';
export type { CmsAdapter, RenderedBody } from './adapter';
