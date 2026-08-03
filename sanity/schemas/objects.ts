import { defineField, defineType } from 'sanity';

/**
 * Genbrugelige objekttyper.
 *
 * Felterne herunder svarer 1:1 til CmsImage/Place/BookMeta/ProjectMeta i
 * web/src/lib/cms/types.ts. Ændrer du noget her, skal det samme ændres
 * dér — det er kontrakten mellem CMS og site.
 */

/** Billede med de metadata galleriet viser. */
export const galleryImage = defineType({
  name: 'galleryImage',
  title: 'Billede',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt-tekst',
      type: 'string',
      description:
        'Kort beskrivelse til skærmlæsere og søgemaskiner. Lad stå tom, hvis billedet er rent dekorativt.',
    }),
    defineField({
      name: 'caption',
      title: 'Billedtekst',
      type: 'string',
      description: 'Vises under billedet i fuldskærmsvisningen.',
    }),
    defineField({ name: 'location', title: 'Sted', type: 'string' }),
    defineField({ name: 'takenAt', title: 'Optaget', type: 'date' }),
    defineField({ name: 'credit', title: 'Fotograf', type: 'string' }),
  ],
  preview: {
    select: { media: 'asset', title: 'caption', subtitle: 'location' },
  },
});

export const place = defineType({
  name: 'place',
  title: 'Sted',
  type: 'object',
  fields: [
    defineField({ name: 'country', title: 'Land', type: 'string' }),
    defineField({ name: 'region', title: 'Region', type: 'string' }),
    defineField({
      name: 'coordinates',
      title: 'Koordinater',
      type: 'geopoint',
      description: 'Valgfrit — bruges hvis der senere skal vises kort.',
    }),
  ],
});

export const bookMeta = defineType({
  name: 'bookMeta',
  title: 'Boginformation',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({ name: 'publisher', title: 'Forlag', type: 'string' }),
    defineField({ name: 'year', title: 'Udgivelsesår', type: 'number' }),
    defineField({ name: 'isbn', title: 'ISBN', type: 'string' }),
    defineField({
      name: 'coAuthors',
      title: 'Medforfattere',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: ['Bog', 'Bogsystem', 'Digitalt læremiddel', 'Rapport', 'Artikel', 'Bog & Net'],
      },
    }),
    defineField({
      name: 'audience',
      title: 'Målgruppe',
      type: 'string',
      description: 'Fx "7.–9. klasse".',
    }),
    defineField({ name: 'purchaseUrl', title: 'Link til bogen', type: 'url' }),
  ],
});

export const projectMeta = defineType({
  name: 'projectMeta',
  title: 'Projektinformation',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({ name: 'client', title: 'Rekvirent', type: 'string' }),
    defineField({ name: 'role', title: 'Rolle', type: 'string' }),
    defineField({ name: 'period', title: 'Periode', type: 'string' }),
    defineField({ name: 'url', title: 'Link', type: 'url' }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Igangværende', value: 'igangvaerende' },
          { title: 'Afsluttet', value: 'afsluttet' },
        ],
      },
    }),
  ],
});

export const cvItem = defineType({
  name: 'cvItem',
  title: 'CV-punkt',
  type: 'object',
  fields: [
    defineField({ name: 'period', title: 'Periode', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'title', title: 'Titel', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'organisation', title: 'Organisation', type: 'string' }),
    defineField({ name: 'description', title: 'Beskrivelse', type: 'text', rows: 3 }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
});

/** Brødtekst. Billeder indlejret her rendres af portable-text.ts. */
export const richText = defineType({
  name: 'richText',
  title: 'Brødtekst',
  type: 'array',
  of: [
    {
      type: 'block',
      styles: [
        { title: 'Brødtekst', value: 'normal' },
        { title: 'Mellemrubrik', value: 'h2' },
        { title: 'Underrubrik', value: 'h3' },
        { title: 'Citat', value: 'blockquote' },
      ],
      marks: {
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [{ name: 'href', type: 'url', title: 'URL' }],
          },
        ],
      },
    },
    { type: 'galleryImage' },
  ],
});
