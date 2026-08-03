/**
 * Kanonisk datamodel for kaareoester.dk
 * ------------------------------------------------------------------
 * Alt indhold i sitet — uanset om det kommer fra lokale markdown-filer
 * eller fra et Headless CMS (Sanity) — bliver mappet ind i typerne
 * herunder. Komponenterne kender kun disse typer, aldrig kilden.
 *
 * Skal du skifte til Sanity, implementerer du blot `CmsAdapter`
 * (se ./adapter.ts) — resten af sitet er uændret.
 */

/** De tre primære indholdstyper på sitet. */
export type EntryKind = 'rejse' | 'projekt' | 'bog';

/** Rute-segment pr. indholdstype, brugt til URL-opbygning. */
export const KIND_SEGMENT: Record<EntryKind, string> = {
  rejse: 'rejser',
  projekt: 'projekter',
  bog: 'boeger',
};

export const KIND_LABEL: Record<EntryKind, { singular: string; plural: string }> = {
  rejse: { singular: 'Rejse', plural: 'Rejser' },
  projekt: { singular: 'Projekt', plural: 'Projekter' },
  bog: { singular: 'Udgivelse', plural: 'Bøger' },
};

/**
 * Et billede, normaliseret på tværs af kilder.
 *
 * Sanity leverer `lqip` (base64 blur-placeholder) og dimensioner via
 * asset-metadata; lokale billeder får dem beregnet ved build.
 */
export interface CmsImage {
  /** Absolut URL eller sti fra site-roden. */
  src: string;
  /** Alt-tekst. Tom streng = dekorativt billede. */
  alt: string;
  /** Billedtekst vist i galleriet. */
  caption?: string;
  /** Fotograf/rettighedshaver. */
  credit?: string;
  /** Stedsangivelse, fx "Tarawa, Kiribati". */
  location?: string;
  /** ISO-dato for hvornår billedet er taget. */
  takenAt?: string;
  width?: number;
  height?: number;
  /** Bredde/højde. Bruges til at layoute galleriet før billedet er hentet. */
  aspectRatio?: number;
  /** Base64 blur-up placeholder (Sanity: `asset->metadata.lqip`). */
  lqip?: string;
  /** Dominerende farve — bruges som baggrund mens billedet loader. */
  dominantColor?: string;
}

/** Geografisk kontekst på en rejse. */
export interface Place {
  country?: string;
  region?: string;
  /** [lng, lat] */
  coordinates?: [number, number];
}

/** Bogspecifikke felter. */
export interface BookMeta {
  publisher?: string;
  year?: number;
  isbn?: string;
  coAuthors?: string[];
  /** fx "Bog", "Digitalt læremiddel", "Bogsystem" */
  format?: string;
  /** Målgruppe, fx "7.–9. klasse" */
  audience?: string;
  purchaseUrl?: string;
}

/** Projektspecifikke felter. */
export interface ProjectMeta {
  client?: string;
  role?: string;
  /** Fritekst-periode, fx "2019–2021" */
  period?: string;
  url?: string;
  status?: 'igangvaerende' | 'afsluttet';
}

/** Et indholdselement — en rejse, et projekt eller en udgivelse. */
export interface Entry {
  id: string;
  kind: EntryKind;
  slug: string;
  /** Færdig URL-sti, fx "/rejser/svalbard". */
  href: string;
  title: string;
  subtitle?: string;
  /** Kort manchet brugt på kort og i metatags. */
  summary: string;
  date: Date;
  updatedAt?: Date;
  cover?: CmsImage;
  gallery: CmsImage[];
  tags: string[];
  featured: boolean;
  draft: boolean;
  place?: Place;
  book?: BookMeta;
  project?: ProjectMeta;
  /** Estimeret læsetid i minutter. */
  readingTime?: number;
}

/**
 * Et foto løsrevet fra sit indlæg — bruges af det samlede
 * billedarkiv på /galleri.
 */
export interface PhotoRef extends CmsImage {
  entryTitle: string;
  entryHref: string;
  entryKind: EntryKind;
  entryDate: Date;
  /** Billedets indeks i indlæggets galleri. */
  index: number;
}

/** Sitets globale indstillinger (redigerbare i CMS). */
export interface SiteSettings {
  title: string;
  tagline: string;
  description: string;
  email: string;
  hero: {
    eyebrow: string;
    heading: string;
    intro: string;
    image?: CmsImage;
  };
}

/** En linje i CV'et. */
export interface CvItem {
  period: string;
  title: string;
  organisation?: string;
  description?: string;
}

/** CV-/biografisiden. */
export interface Biography {
  name: string;
  role: string;
  portrait?: CmsImage;
  /** Afsnit i introteksten. */
  intro: string[];
  quote?: { text: string; source?: string };
  facts: { label: string; value: string }[];
  experience: CvItem[];
  education: CvItem[];
  skills: string[];
  partners: string[];
  selectedWorks: CvItem[];
}

/** Filtreringsmuligheder ved opslag af entries. */
export interface EntryQuery {
  kind?: EntryKind | EntryKind[];
  tag?: string;
  featured?: boolean;
  limit?: number;
  /** Udelad et bestemt slug (fx det man allerede kigger på). */
  exclude?: string;
  /** Standard er 'date-desc'. */
  order?: 'date-desc' | 'date-asc' | 'title';
}
