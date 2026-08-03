import type { StructureResolver } from 'sanity/structure';

/**
 * Menustrukturen i Sanity Studio.
 *
 * Indstillinger og biografi er singletons — de skal ikke kunne
 * oprettes flere gange, så de vises som ét dokument hver.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Indhold')
    .items([
      S.documentTypeListItem('rejse').title('Rejser'),
      S.documentTypeListItem('projekt').title('Projekter'),
      S.documentTypeListItem('bog').title('Bøger & udgivelser'),

      S.divider(),

      S.listItem()
        .title('Biografi & CV')
        .id('biografi')
        .child(S.document().schemaType('biografi').documentId('biografi')),

      S.listItem()
        .title('Indstillinger')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ]);
