import { bog, biografi, projekt, rejse, siteSettings } from './documents';
import { bookMeta, cvItem, galleryImage, place, projectMeta, richText } from './objects';

/**
 * Samlet skema til Sanity Studio.
 *
 *   // sanity.config.ts
 *   import { schemaTypes } from './schemas';
 *   export default defineConfig({ schema: { types: schemaTypes }, ... });
 */
export const schemaTypes = [
  // Dokumenter
  rejse,
  projekt,
  bog,
  siteSettings,
  biografi,
  // Objekter
  galleryImage,
  place,
  bookMeta,
  projectMeta,
  cvItem,
  richText,
];
