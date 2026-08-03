import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { CmsImage } from './cms/types';

/**
 * Broen mellem CMS-billeder og Astros billedpipeline.
 * ------------------------------------------------------------------
 * Indhold refererer billeder som "/billeder/navn.jpg". Filerne ligger
 * i src/assets/billeder, så Astro kan optimere dem: WebP/AVIF, srcset
 * i flere størrelser og korrekte dimensioner (ingen layout shift).
 *
 * Billeder fra Sanity (cdn.sanity.io) transformeres i stedet af deres
 * eget CDN — se sanityImageUrl() i lib/cms/sanity.ts.
 */

const localImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/billeder/**/*.{jpeg,jpg,png,webp,avif,gif}',
  { eager: true },
);

const PREFIX = '/src/assets/billeder/';

/** Slår en indholdssti op i de lokale assets. */
export function resolveLocal(src: string): ImageMetadata | undefined {
  if (!src || /^https?:\/\//.test(src)) return undefined;
  const name = src.replace(/^\/+/, '').replace(/^billeder\//, '');
  return localImages[`${PREFIX}${name}`]?.default;
}

export const isRemote = (src: string) => /^https?:\/\//.test(src);

export interface ProcessedImage {
  src: string;
  srcset?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

/**
 * Genererer en optimeret variant af et billede.
 * Falder tilbage til den oprindelige URL, hvis billedet ikke er lokalt.
 */
export async function processImage(
  image: CmsImage,
  options: {
    width?: number;
    widths?: number[];
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg';
  } = {},
): Promise<ProcessedImage> {
  const local = resolveLocal(image.src);

  if (!local) {
    return {
      src: image.src,
      width: image.width,
      height: image.height,
      aspectRatio: image.aspectRatio,
    };
  }

  const { width = Math.min(local.width, 1600), widths, quality = 80, format = 'webp' } = options;

  const result = await getImage({
    src: local,
    width: Math.min(width, local.width),
    widths: widths?.filter((w) => w <= local.width),
    format,
    quality,
  });

  return {
    src: result.src,
    srcset: result.srcSet?.attribute || undefined,
    width: Number(result.attributes.width ?? local.width),
    height: Number(result.attributes.height ?? local.height),
    aspectRatio: local.width / local.height,
  };
}

/** Fuld opløsning til lightboxen. */
export const processFullsize = (image: CmsImage) =>
  processImage(image, { width: 2400, quality: 84 });

/**
 * Delebillede til Open Graph. JPEG frem for WebP, fordi flere
 * beskedtjenester stadig kun viser forhåndsvisning af JPEG/PNG.
 */
export const processSocial = (image: CmsImage) =>
  processImage(image, { width: 1200, quality: 78, format: 'jpeg' });

/** Miniature til gitre og filmstrimmel. */
export const processThumb = (image: CmsImage) => processImage(image, { width: 640, quality: 74 });
