/** Datamodellen som galleriet arbejder på — bevidst løsrevet fra CMS-typerne. */
export interface GalleryPhoto {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  location?: string;
  takenAt?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  lqip?: string;
  dominantColor?: string;
  /** Valgfrit link tilbage til det indlæg billedet hører til. */
  href?: string;
  /** Titel på indlægget — vises i galleriets infolinje. */
  contextTitle?: string;
}

/** Rektangel for det miniaturebillede der blev klikket på (til FLIP-animationen). */
export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface OpenGalleryDetail {
  photos: GalleryPhoto[];
  index: number;
  origin?: OriginRect;
  /** Titel vist i galleriets sidehoved. */
  title?: string;
  galleryId?: string;
}

export const OPEN_GALLERY_EVENT = 'kaare:open-gallery';
