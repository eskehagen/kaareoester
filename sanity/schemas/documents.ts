import { defineArrayMember, defineField, defineType } from 'sanity';

/**
 * Dokumenttyperne som Kaare redigerer i Sanity Studio.
 *
 * De tre indholdstyper (rejse / projekt / bog) deler den samme kerne,
 * så sitet kan behandle dem ens — kun de sidste par felter er
 * type-specifikke.
 */

/** Felter alle tre indholdstyper har til fælles. */
const faellesFelter = [
  defineField({
    name: 'title',
    title: 'Titel',
    type: 'string',
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'slug',
    title: 'URL-navn',
    type: 'slug',
    options: { source: 'title', maxLength: 96 },
    validation: (rule) => rule.required(),
  }),
  defineField({ name: 'subtitle', title: 'Undertitel', type: 'string' }),
  defineField({
    name: 'summary',
    title: 'Manchet',
    type: 'text',
    rows: 3,
    description: 'Vises på kort og i søgeresultater. Hold den under ca. 200 tegn.',
    validation: (rule) => rule.max(220).warning('Manchetten bliver klippet af, hvis den er længere.'),
  }),
  defineField({
    name: 'date',
    title: 'Dato',
    type: 'date',
    initialValue: () => new Date().toISOString().slice(0, 10),
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: 'cover',
    title: 'Forsidebillede',
    type: 'galleryImage',
    description: 'Bruges på kort, i toppen af siden og ved deling på sociale medier.',
  }),
  defineField({
    name: 'gallery',
    title: 'Billedgalleri',
    type: 'array',
    of: [defineArrayMember({ type: 'galleryImage' })],
    options: { layout: 'grid' },
    description: 'Træk billederne i den rækkefølge de skal vises i fuldskærmsgalleriet.',
  }),
  defineField({
    name: 'body',
    title: 'Tekst',
    type: 'richText',
  }),
  defineField({
    name: 'tags',
    title: 'Emner',
    type: 'array',
    of: [defineArrayMember({ type: 'string' })],
    options: { layout: 'tags' },
    description: 'Bruges til filtrering på kategorisiderne.',
  }),
  defineField({
    name: 'featured',
    title: 'Fremhæv på forsiden',
    type: 'boolean',
    initialValue: false,
  }),
  defineField({
    name: 'draft',
    title: 'Kladde',
    type: 'boolean',
    initialValue: false,
    description: 'Kladder vises ikke på det offentlige site.',
  }),
];

const standardPreview = {
  select: { title: 'title', subtitle: 'date', media: 'cover' },
};

export const rejse = defineType({
  name: 'rejse',
  title: 'Rejse',
  type: 'document',
  fields: [...faellesFelter, defineField({ name: 'place', title: 'Sted', type: 'place' })],
  preview: standardPreview,
  orderings: [
    { title: 'Nyeste først', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
});

export const projekt = defineType({
  name: 'projekt',
  title: 'Projekt',
  type: 'document',
  fields: [
    ...faellesFelter,
    defineField({ name: 'project', title: 'Projektinformation', type: 'projectMeta' }),
  ],
  preview: standardPreview,
  orderings: [
    { title: 'Nyeste først', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
});

export const bog = defineType({
  name: 'bog',
  title: 'Bog / udgivelse',
  type: 'document',
  fields: [
    ...faellesFelter,
    defineField({ name: 'book', title: 'Boginformation', type: 'bookMeta' }),
  ],
  preview: standardPreview,
  orderings: [
    { title: 'Nyeste først', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
});

/** Singleton: sitets tekster og forsidens hero. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Indstillinger',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Sitets titel', type: 'string' }),
    defineField({ name: 'tagline', title: 'Undertekst', type: 'string' }),
    defineField({ name: 'description', title: 'Beskrivelse', type: 'text', rows: 3 }),
    defineField({ name: 'email', title: 'E-mail', type: 'string' }),
    defineField({
      name: 'hero',
      title: 'Forsidens top',
      type: 'object',
      fields: [
        defineField({ name: 'eyebrow', title: 'Overlinje', type: 'string' }),
        defineField({ name: 'heading', title: 'Overskrift', type: 'string' }),
        defineField({ name: 'intro', title: 'Introtekst', type: 'text', rows: 4 }),
        defineField({ name: 'image', title: 'Billede', type: 'galleryImage' }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Indstillinger' }) },
});

/** Singleton: biografi- og CV-siden. */
export const biografi = defineType({
  name: 'biografi',
  title: 'Biografi & CV',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Navn', type: 'string' }),
    defineField({ name: 'role', title: 'Titel', type: 'string' }),
    defineField({ name: 'portrait', title: 'Portræt', type: 'galleryImage' }),
    defineField({
      name: 'intro',
      title: 'Introafsnit',
      type: 'array',
      of: [defineArrayMember({ type: 'text' })],
    }),
    defineField({
      name: 'quote',
      title: 'Citat',
      type: 'object',
      fields: [
        defineField({ name: 'text', title: 'Citat', type: 'text', rows: 3 }),
        defineField({ name: 'source', title: 'Kilde', type: 'string' }),
      ],
    }),
    defineField({
      name: 'facts',
      title: 'Nøgletal',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string' }),
            defineField({ name: 'value', title: 'Værdi', type: 'string' }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'experience',
      title: 'Erfaring',
      type: 'array',
      of: [defineArrayMember({ type: 'cvItem' })],
    }),
    defineField({
      name: 'education',
      title: 'Uddannelse',
      type: 'array',
      of: [defineArrayMember({ type: 'cvItem' })],
    }),
    defineField({
      name: 'skills',
      title: 'Arbejdsområder',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'partners',
      title: 'Samarbejdspartnere',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'selectedWorks',
      title: 'Udvalgte værker',
      type: 'array',
      of: [defineArrayMember({ type: 'cvItem' })],
    }),
  ],
  preview: { prepare: () => ({ title: 'Biografi & CV' }) },
});
