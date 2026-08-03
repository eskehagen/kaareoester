import { getCollection, getEntry as getCollectionEntry, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
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

type CollectionName = 'rejser' | 'projekter' | 'boeger';

const KIND_OF: Record<CollectionName, EntryKind> = {
  rejser: 'rejse',
  projekter: 'projekt',
  boeger: 'bog',
};

const COLLECTION_OF: Record<EntryKind, CollectionName> = {
  rejse: 'rejser',
  projekt: 'projekter',
  bog: 'boeger',
};

/** Normaliserer "sti-eller-objekt" til et fuldt CmsImage. */
function toImage(value: string | Partial<CmsImage> | undefined): CmsImage | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return { src: value, alt: '' };
  if (!value.src) return undefined;
  return { alt: '', ...value } as CmsImage;
}

/** ~200 ord i minuttet, minimum 1. */
function readingTime(body: string | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}

function toEntry(item: CollectionEntry<CollectionName>): Entry {
  const kind = KIND_OF[item.collection as CollectionName];
  const data = item.data as any;
  const gallery: CmsImage[] = (data.gallery ?? [])
    .map((g: any) => toImage(g))
    .filter(Boolean) as CmsImage[];

  return {
    id: item.id,
    kind,
    slug: item.id,
    href: `/${KIND_SEGMENT[kind]}/${item.id}`,
    title: data.title,
    subtitle: data.subtitle,
    summary: data.summary ?? '',
    date: data.date,
    updatedAt: data.updatedAt,
    cover: toImage(data.cover) ?? gallery[0],
    gallery,
    tags: data.tags ?? [],
    featured: data.featured ?? false,
    draft: data.draft ?? false,
    place: data.place,
    book: data.book,
    project: data.project,
    readingTime: readingTime(item.body),
  };
}

const isPublished = (entry: Entry) => import.meta.env.DEV || !entry.draft;

function sortEntries(entries: Entry[], order: EntryQuery['order'] = 'date-desc'): Entry[] {
  const sorted = [...entries];
  if (order === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'da'));
  } else {
    sorted.sort((a, b) => a.date.getTime() - b.date.getTime());
    if (order === 'date-desc') sorted.reverse();
  }
  return sorted;
}

let cache: Entry[] | null = null;

async function allEntries(): Promise<Entry[]> {
  if (cache) return cache;
  const collections: CollectionName[] = ['rejser', 'projekter', 'boeger'];
  const results = await Promise.all(collections.map((name) => getCollection(name)));
  cache = results.flat().map(toEntry).filter(isPublished);
  return cache;
}

export const localAdapter: CmsAdapter = {
  name: 'local',

  async getEntries(query = {}) {
    const kinds = query.kind
      ? Array.isArray(query.kind)
        ? query.kind
        : [query.kind]
      : undefined;

    let entries = await allEntries();

    if (kinds) entries = entries.filter((e) => kinds.includes(e.kind));
    if (query.tag) {
      const needle = query.tag.toLowerCase();
      entries = entries.filter((e) => e.tags.some((t) => t.toLowerCase() === needle));
    }
    if (query.featured !== undefined) entries = entries.filter((e) => e.featured === query.featured);
    if (query.exclude) entries = entries.filter((e) => e.slug !== query.exclude);

    entries = sortEntries(entries, query.order);
    return query.limit ? entries.slice(0, query.limit) : entries;
  },

  async getEntry(kind, slug) {
    const item = await getCollectionEntry(COLLECTION_OF[kind], slug);
    if (!item) return null;
    const entry = toEntry(item as CollectionEntry<CollectionName>);
    return isPublished(entry) ? entry : null;
  },

  async renderBody(entry): Promise<RenderedBody> {
    const item = await getCollectionEntry(COLLECTION_OF[entry.kind], entry.slug);
    if (!item) return { type: 'html', html: '', headings: [] };
    const { Content, headings } = await render(item);
    return { type: 'astro', Content, headings };
  },

  async getPhotos(query = {}) {
    const entries = await this.getEntries({ kind: query.kind, tag: query.tag });
    const photos: PhotoRef[] = [];

    for (const entry of entries) {
      // Coveret tælles med, hvis det ikke allerede ligger i galleriet.
      const images = entry.cover && !entry.gallery.some((g) => g.src === entry.cover!.src)
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
    const entries = await allEntries();
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'da'));
  },

  async getSettings(): Promise<SiteSettings> {
    const item = await getCollectionEntry('settings', 'site');
    const { id, ...settings } = item!.data as any;
    return settings as SiteSettings;
  },

  async getBiography(): Promise<Biography> {
    const item = await getCollectionEntry('biografi', 'biografi');
    const { id, ...bio } = item!.data as any;
    return bio as Biography;
  },
};
