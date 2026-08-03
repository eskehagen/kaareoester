import { createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import type { OpenGalleryDetail, OriginRect } from './types';

/**
 * Selve fuldskærmsgalleriet — indlæses først når brugeren åbner det.
 *
 * Dette modul (React + Framer Motion + Lightbox) ligger i sin egen chunk.
 * Resten af sitet sender ikke ét byte af det til browseren, før nogen
 * klikker på et billede. Controlleren i LightboxHost.astro står for
 * klik-håndtering og forhenter modulet ved hover.
 */

let root: Root | null = null;
let container: HTMLElement | null = null;
let current: (OpenGalleryDetail & { origin?: OriginRect; originAspect?: number }) | null = null;
let pushedHistory = false;

function ensureRoot(): Root {
  if (root) return root;

  container = document.getElementById('lightbox-root') ?? document.createElement('div');
  if (!container.isConnected) {
    container.id = 'lightbox-root';
    document.body.appendChild(container);
  }

  root = createRoot(container);
  return root;
}

/** Finder miniaturebilledet igen, så lukkeanimationen rammer det rigtige sted. */
function resolveOrigin(index: number): OriginRect | undefined {
  if (!current?.galleryId) return undefined;

  const node = document.querySelector(
    `[data-gallery="${current.galleryId}"] [data-gallery-item="${index}"] img`,
  );
  if (!node) return undefined;

  const rect = node.getBoundingClientRect();
  const visible = rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  return visible ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : undefined;
}

function syncHash(index: number) {
  if (!current?.galleryId) return;
  history.replaceState(
    { lightbox: true },
    '',
    `#g=${encodeURIComponent(current.galleryId)}&i=${index}`,
  );
}

function render() {
  ensureRoot().render(
    createElement(
      StrictMode,
      null,
      createElement(
        AnimatePresence,
        null,
        current
          ? createElement(Lightbox, {
              key: `${current.galleryId ?? 'galleri'}-${current.index}`,
              photos: current.photos,
              startIndex: current.index,
              origin: current.origin,
              originAspect: current.originAspect,
              title: current.title,
              onClose: closeGallery,
              onIndexChange: syncHash,
              resolveOrigin,
            })
          : null,
      ),
    ),
  );
}

export function openGallery(
  detail: OpenGalleryDetail & { origin?: OriginRect; originAspect?: number; skipHistory?: boolean },
) {
  current = detail;
  render();

  if (detail.galleryId && !detail.skipHistory) {
    history.pushState(
      { lightbox: true },
      '',
      `#g=${encodeURIComponent(detail.galleryId)}&i=${detail.index}`,
    );
    pushedHistory = true;
  }
}

export function closeGallery(fromHistory = false) {
  current = null;
  render();

  if (pushedHistory && !fromHistory) {
    pushedHistory = false;
    history.back();
  }
  pushedHistory = false;
}

/** Tilbageknappen lukker galleriet i stedet for at forlade siden. */
window.addEventListener('popstate', () => {
  if (current) closeGallery(true);
});
