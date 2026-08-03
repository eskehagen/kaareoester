import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/**
 * Content collections — den lokale indholdskilde.
 *
 * Skemaerne herunder er 1:1 med Sanity-skemaerne i /sanity/schemas.
 * Ændrer du et felt her, skal det samme felt ændres dér — så kan man
 * skifte kilde uden at røre en eneste komponent.
 */

const image = z.object({
  src: z.string(),
  alt: z.string().default(''),
  caption: z.string().optional(),
  credit: z.string().optional(),
  location: z.string().optional(),
  takenAt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspectRatio: z.number().optional(),
  lqip: z.string().optional(),
  dominantColor: z.string().optional(),
});

/**
 * Galleri accepterer både `"/sti/til/billede.jpg"` og det fulde objekt,
 * så redaktøren kan nøjes med en liste af stier i simple tilfælde.
 */
const galleryImage = z.union([z.string(), image]).transform((value) =>
  typeof value === 'string' ? { src: value, alt: '' } : value,
);

const baseFields = {
  title: z.string(),
  subtitle: z.string().optional(),
  summary: z.string().default(''),
  date: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  cover: z.union([z.string(), image]).optional(),
  gallery: z.array(galleryImage).default([]),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
};

const rejser = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/rejser' }),
  schema: z.object({
    ...baseFields,
    place: z
      .object({
        country: z.string().optional(),
        region: z.string().optional(),
        coordinates: z.tuple([z.number(), z.number()]).optional(),
      })
      .optional(),
  }),
});

const projekter = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projekter' }),
  schema: z.object({
    ...baseFields,
    project: z
      .object({
        client: z.string().optional(),
        role: z.string().optional(),
        period: z.string().optional(),
        url: z.string().optional(),
        status: z.enum(['igangvaerende', 'afsluttet']).optional(),
      })
      .optional(),
  }),
});

const boeger = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/boeger' }),
  schema: z.object({
    ...baseFields,
    book: z
      .object({
        publisher: z.string().optional(),
        year: z.number().optional(),
        isbn: z.string().optional(),
        coAuthors: z.array(z.string()).default([]),
        format: z.string().optional(),
        audience: z.string().optional(),
        purchaseUrl: z.string().optional(),
      })
      .optional(),
  }),
});

/** Sitets globale indstillinger + forsidens hero. */
const settings = defineCollection({
  loader: file('./src/content/settings/site.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    tagline: z.string(),
    description: z.string(),
    email: z.string(),
    hero: z.object({
      eyebrow: z.string(),
      heading: z.string(),
      intro: z.string(),
      image: image.optional(),
    }),
  }),
});

const cvItem = z.object({
  period: z.string(),
  title: z.string(),
  organisation: z.string().optional(),
  description: z.string().optional(),
});

/** Biografi-/CV-siden. */
const biografi = defineCollection({
  loader: file('./src/content/biografi/biografi.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    portrait: image.optional(),
    intro: z.array(z.string()),
    quote: z.object({ text: z.string(), source: z.string().optional() }).optional(),
    facts: z.array(z.object({ label: z.string(), value: z.string() })),
    experience: z.array(cvItem),
    education: z.array(cvItem),
    skills: z.array(z.string()),
    partners: z.array(z.string()),
    selectedWorks: z.array(cvItem),
  }),
});

export const collections = { rejser, projekter, boeger, settings, biografi };
