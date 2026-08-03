import type { Biography, Entry, EntryQuery, PhotoRef, SiteSettings } from './types';

/**
 * Kontrakten mellem sitet og indholdskilden.
 *
 * Der findes to implementeringer:
 *  - `local`  — Astro content collections (markdown i src/content). Standard.
 *  - `sanity` — Headless CMS. Aktiveres med CMS_SOURCE=sanity.
 *
 * Begge returnerer nøjagtig samme former, så sider og komponenter
 * behøver ikke vide, hvor indholdet kommer fra.
 */
export interface CmsAdapter {
  readonly name: string;

  /** Alle entries der matcher forespørgslen, sorteret. */
  getEntries(query?: EntryQuery): Promise<Entry[]>;

  /** Ét entry via kind + slug. `null` hvis det ikke findes. */
  getEntry(kind: Entry['kind'], slug: string): Promise<Entry | null>;

  /**
   * Renderet brødtekst for et entry.
   * Returnerer en Astro-komponent (markdown) eller HTML-streng (CMS).
   */
  renderBody(entry: Entry): Promise<RenderedBody>;

  /** Alle billeder på tværs af sitet — til det samlede billedarkiv. */
  getPhotos(query?: Pick<EntryQuery, 'kind' | 'tag' | 'limit'>): Promise<PhotoRef[]>;

  /** Alle anvendte tags med antal, sorteret efter hyppighed. */
  getTags(): Promise<{ tag: string; count: number }[]>;

  getSettings(): Promise<SiteSettings>;

  getBiography(): Promise<Biography>;
}

/**
 * Renderet indhold. `Content` er en Astro-komponent når kilden er
 * markdown; `html` er sat når kilden leverer færdig HTML (Portable Text
 * konverteret i sanity-adapteren).
 */
export type RenderedBody =
  | { type: 'astro'; Content: any; headings: { depth: number; slug: string; text: string }[] }
  | { type: 'html'; html: string; headings: { depth: number; slug: string; text: string }[] };
