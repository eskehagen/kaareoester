import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from './types';

/** Låser baggrundens scroll uden at siden hopper (scrollbar-kompensation). */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const previous = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
    };
  }, [active]);
}

/** Henter nabobilleder ind i browserens cache, så navigation føles øjeblikkelig. */
export function usePreload(photos: GalleryPhoto[], index: number, radius = 2) {
  useEffect(() => {
    if (!photos.length) return;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const target = photos[(index + offset + photos.length) % photos.length];
      if (!target) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = target.src;
    }
  }, [photos, index, radius]);
}

/** Fanger tastaturfokus inde i galleriet, mens det er åbent. */
export function useFocusTrap(active: boolean, container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    container.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !container.current) return;
      const focusable = container.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || current === container.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active, container]);
}

/**
 * Diasshow med pause/afspil. Returnerer også fremdriften 0–1, så knappen
 * kan tegne en progress-ring.
 */
export function useSlideshow(active: boolean, onAdvance: () => void, interval = 4500) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number>(0);
  const start = useRef<number>(0);

  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  useEffect(() => {
    if (!playing || !active) {
      setProgress(0);
      return;
    }

    start.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start.current;
      const ratio = Math.min(1, elapsed / interval);
      setProgress(ratio);

      if (ratio >= 1) {
        start.current = now;
        onAdvance();
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, active, interval, onAdvance]);

  const toggle = useCallback(() => setPlaying((value) => !value), []);
  return { playing, progress, toggle, stop: () => setPlaying(false) };
}

/** Respekterer brugerens ønske om reduceret bevægelse. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return reduced;
}
