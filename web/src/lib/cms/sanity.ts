import type { CmsAdapter, RenderedBody } from './adapter';
import { KIND_SEGMENT } from './types';
import type {
  Biography,
  CmsImage,
  Entry,
  EntryKind,
  EntryQuery,
  PhotoRef,
  SiteSettings,
} from './types';
import { portableTextToHtml, type PortableTextBlock } from './portable-text';

/**
 * Sanity-adapter — aktiveres med CMS_SOURCE=sanity i .env
 * ------------------------------------------------------------------
 * Bevidst skrevet uden @sanity/client: den henter via den offentlige
 * HTTP-API med `fetch`, så der ikke skal installeres noget for at
 * skifte kilde. Alle kald sker ved build-tid (statisk site), så der er
 * ingen runtime-omkostning for den besøgende.
 *
 * Opsætning:
 *   1. Opret et Sanity-projekt og deploy skemaerne i /sanity/schemas
 *   2. Udfyld .env (se .env.example)
 *   3. CMS_SOURCE=sanity npm run build
 */

const PROJECT_ID = import.meta.env.SANITY_PROJECT_ID ?? '';
const DATASET = import.meta.env.SANITY_DATASET ?? 'production';
const API_VERSION = import.meta.env.SANITY_API_VERSION ?? '2024-10-01';
const TOKEN = import.meta.env.SANITY_READ_TOKEN ?? '';
const USE_CDN = import.meta.env.SANITY_USE_CDN !== 'false';

const DOC_TYPE: Record<EntryKind, string> = {
  rejse: 'rejse',
  projekt: 'projekt',
  bog: 'bog',
};

const KIND_OF_TYPE: Record<string, EntryKind> = {
  rejse: 'rejse',
  projekt: 'projekt',
  bog: 'bog',
};

/** Kører en GROQ-forespørgsel mod Sanity. */
async function groq<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!PROJECT_ID) {
    throw new Error(
      'SANITY_PROJECT_ID mangler. Sæt den i .env, eller kør med CMS_SOURCE=local.',
    );
  }

  const host = USE_CDN ? 'apicdn.sanity.io' : 'api.sanity.io';
  const url = new URL(`https://${PROJECT_ID}.${host}/v${API_VERSION}/data/query/${DATASET}`);
  url.searchParams.set('query', query);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(`$${key}`, JSON.stringify(value));
  }

  const response = await fetch(url, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Sanity-forespørgsel fejlede (${response.status}): ${await response.text()}`);
  }

  const { result } = (await response.json()) as { result: T };
  return result;
}

/**
 * Bygger en URL til Sanitys billed-CDN med transformationer.
 * Eksporteres, så komponenter kan bede om præcis den størrelse de bruger.
 */
export function sanityImageUrl(
  image: CmsImage,
  options: { width?: number; height?: number; quality?: number; fit?: 'crop' | 'max' } = {},
): string {
  if (!image.src.includes('cdn.sanity.io')) return image.src;
  const url = new URL(image.src);
  const { width, height, quality = 82, fit = 'max' } = options;
  if (width) url.searchParams.set('w', String(width));
  if (height) url.searchParams.set('h', String(height));
  url.searchParams.set('q', String(quality));
  url.searchParams.set('fit', fit);
  url.searchParams.set('auto', 'format');
  return url.toString();
}

/** GROQ-projektion for et billede med metadata fra asset-dokumentet. */
const IMAGE_PROJECTION = `{
  "src": asset->url,
  "alt": coalesce(alt, ""),
  caption,
  credit,
  location,
  takenAt,
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "aspectRatio": asset->metadata.dimensions.aspectRatio,
  "lqip": asset->metadata.lqip,
  "dominantColor": asset->metadata.palette.dominant.background
}`;

const ENTRY_PROJECTION = `{
  "id": _id,
  "type": _type,
  "slug": slug.current,
  title,
  subtitle,
  summary,
  date,
  "updatedAt": _updatedAt,
  "cover": cover${IMAGE_PROJECTION},
  "gallery": gallery[]${IMAGE_PROJECTION},
  "tags": coalesce(tags, []),
  "featured": coalesce(featured, false),
  "draft": coalesce(draft, false),
  place,
  book,
  project,
  body
}`;

interface RawEntry {
  id: string;
  type: string;
  slug: string;
  title: string;
  subtitle?: string;
  summary?: string;
  date: string;
  updatedAt?: string;
  cover?: CmsImage;
  gallery?: CmsImage[];
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
  place?: Entry['place'];
  book?: Entry['book'];
  project?: Entry['project'];
  body?: PortableTextBlock[];
}

const bodyCache = new Map<string, PortableTextBlock[]>();

function toEntry(raw: RawEntry): Entry {
  const kind = KIND_OF_TYPE[raw.type] ?? 'rejse';
  const gallery = (raw.gallery ?? []).filter((image) => Boolean(image?.src));
  if (raw.body) bodyCache.set(raw.id, raw.body);

  return {
    id: raw.id,
    kind,
    slug: raw.slug,
    href: `/${KIND_SEGMENT[kind]}/${raw.slug}`,
    title: raw.title,
    subtitle: raw.subtitle,
    summary: raw.summary ?? '',
    date: new Date(raw.date),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
    cover: raw.cover?.src ? raw.cover : gallery[0],
    gallery,
    tags: raw.tags ?? [],
    featured: raw.featured ?? false,
    draft: raw.draft ?? false,
    place: raw.place,
    book: raw.book,
    project: raw.project,
  };
}

function buildFilter(query: EntryQuery): string {
  const kinds = query.kind ? (Array.isArray(query.kind) ? query.kind : [query.kind]) : undefined;
  const clauses = [
    kinds
      ? `_type in [${kinds.map((k) => `"${DOC_TYPE[k]}"`).join(', ')}]`
      : `_type in ["rejse", "projekt", "bog"]`,
    `!(_id in path("drafts.**"))`,
    `coalesce(draft, false) == false`,
  ];
  if (query.tag) clauses.push(`"${query.tag}" in tags`);
  if (query.featured !== undefined) clauses.push(`coalesce(featured, false) == ${query.featured}`);
  if (query.exclude) clauses.push(`slug.current != "${query.exclude}"`);
  return clauses.join(' && ');
}

const ORDER_BY: Record<NonNullable<EntryQuery['order']>, string> = {
  'date-desc': 'date desc',
  'date-asc': 'date asc',
  title: 'title asc',
};

export const sanityAdapter: CmsAdapter = {
  name: 'sanity',

  async getEntries(query = {}) {
    const slice = query.limit ? `[0...${query.limit}]` : '';
    const raw = await groq<RawEntry[]>(
      `*[${buildFilter(query)}] | order(${ORDER_BY[query.order ?? 'date-desc']})${slice} ${ENTRY_PROJECTION}`,
    );
    return raw.map(toEntry);
  },

  async getEntry(kind, slug) {
    const raw = await groq<RawEntry | null>(
      `*[_type == "${DOC_TYPE[kind]}" && slug.current == $slug && !(_id in path("drafts.**"))][0] ${ENTRY_PROJECTION}`,
      { slug },
    );
    return raw ? toEntry(raw) : null;
  },

  async renderBody(entry): Promise<RenderedBody> {
    let blocks = bodyCache.get(entry.id);
    if (!blocks) {
      blocks = (await groq<PortableTextBlock[]>(`*[_id == $id][0].body`, { id: entry.id })) ?? [];
    }
    return { type: 'html', ...portableTextToHtml(blocks) };
  },

  async getPhotos(query = {}) {
    const entries = await this.getEntries({ kind: query.kind, tag: query.tag });
    const photos: PhotoRef[] = [];

    for (const entry of entries) {
      const images =
        entry.cover && !entry.gallery.some((g) => g.src === entry.cover!.src)
          ? [entry.cover, ...entry.gallery]
          : entry.gallery;

      images.forEach((image, index) => {
        photos.push({
          ...image,
          alt: image.alt || `${entry.title} — billede ${index + 1}`,
          entryTitle: entry.title,
          entryHref: entry.href,
          entryKind: entry.kind,
          entryDate: entry.date,
          index,
        });
      });
    }

    return query.limit ? photos.slice(0, query.limit) : photos;
  },

  async getTags() {
    const tags = await groq<string[]>(
      `array::unique(*[_type in ["rejse", "projekt", "bog"]].tags[])`,
    );
    const counts = await Promise.all(
      (tags ?? []).map(async (tag) => ({
        tag,
        count: await groq<number>(`count(*[_type in ["rejse","projekt","bog"] && $tag in tags])`, {
          tag,
        }),
      })),
    );
    return counts.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'da'));
  },

  async getSettings() {
    const settings = await groq<SiteSettings>(
      `*[_type == "siteSettings"][0]{
        title, tagline, description, email,
        hero { eyebrow, heading, intro, "image": image${IMAGE_PROJECTION} }
      }`,
    );
    return settings;
  },

  async getBiography() {
    const bio = await groq<Biography>(
      `*[_type == "biografi"][0]{
        name, role, "portrait": portrait${IMAGE_PROJECTION},
        intro, quote, facts, experience, education, skills, partners, selectedWorks
      }`,
    );
    return bio;
  },
};
