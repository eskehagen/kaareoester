import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import type { GalleryPhoto, OriginRect } from './types';
import {
  useFocusTrap,
  usePreload,
  useReducedMotion,
  useScrollLock,
  useSlideshow,
} from './useLightbox';

/**
 * Fuldskærmsgalleriet.
 * ------------------------------------------------------------------
 * Designet til at føles som en app frem for en hjemmeside:
 *
 *  · Billedet folder sig ud fra det miniaturebillede man klikkede på
 *    (FLIP — kun transforms, så det kører på GPU'en)
 *  · Swipe/træk vandret skifter billede, træk nedad lukker
 *  · Dobbeltklik eller Z zoomer ind, og man kan panorere rundt
 *  · Filmstrimmel, diasshow, fuldskærm og en foldbar infopanel
 *  · Fuld tastaturbetjening og fokusfælde
 */

/** Pladsen omkring billedet — skal matche layoutet herunder. */
const STAGE = {
  top: 78,
  bottom: 128,
  sideMobile: 12,
  sideDesktop: 92,
  breakpoint: 900,
};

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 32, mass: 0.9 };
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 420, damping: 40 };

export interface LightboxProps {
  photos: GalleryPhoto[];
  startIndex: number;
  origin?: OriginRect;
  /** Fotoets sande sideforhold (bredde/højde) — bruges til åbningsanimationen. */
  originAspect?: number;
  title?: string;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  /** Slår galleriet op på et miniaturebillede igen, så lukkeanimationen rammer rigtigt. */
  resolveOrigin?: (index: number) => OriginRect | undefined;
}

/** Beregner hvor billedet lander på skærmen (object-contain i scenen). */
function fittedRect(aspect: number) {
  const side = window.innerWidth < STAGE.breakpoint ? STAGE.sideMobile : STAGE.sideDesktop;
  const stageWidth = Math.max(1, window.innerWidth - side * 2);
  const stageHeight = Math.max(1, window.innerHeight - STAGE.top - STAGE.bottom);

  let width = stageWidth;
  let height = width / aspect;
  if (height > stageHeight) {
    height = stageHeight;
    width = height * aspect;
  }

  return {
    width,
    height,
    left: side + (stageWidth - width) / 2,
    top: STAGE.top + (stageHeight - height) / 2,
  };
}

/** Transform der placerer det fyldte billede oven i miniaturebilledet. */
function flipTransform(origin: OriginRect, aspect: number) {
  const target = fittedRect(aspect);
  return {
    x: origin.left + origin.width / 2 - (target.left + target.width / 2),
    y: origin.top + origin.height / 2 - (target.top + target.height / 2),
    scale: Math.max(0.05, origin.width / target.width),
  };
}

export default function Lightbox({
  photos,
  startIndex,
  origin,
  originAspect,
  title,
  onClose,
  onIndexChange,
  resolveOrigin,
}: LightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const aspectRef = useRef<number>(originAspect ?? 1.5);

  const reducedMotion = useReducedMotion();
  const photo = photos[index];
  const count = photos.length;

  useScrollLock(true);
  usePreload(photos, index);
  useFocusTrap(true, containerRef);

  /* --- Bevægelsesværdier: åbning, swipe og lukkegestus deler samme lag --- */
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const flipX = useMotionValue(0);
  const flipY = useMotionValue(0);
  const flipScale = useMotionValue(1);
  const backdrop = useMotionValue(0);

  // Når man trækker nedad, skrumper og falmer billedet — feedback på "slip for at lukke".
  const dismissProgress = useTransform(dragY, [-260, 0, 260], [1, 0, 1]);
  const dismissScale = useTransform(dismissProgress, (value) => 1 - value * 0.22);
  const dismissOpacity = useTransform(dismissProgress, (value) => 1 - value * 0.55);
  const backdropOpacity = useTransform([backdrop, dismissProgress], ([base, dismiss]) =>
    Math.max(0, (base as number) - (dismiss as number) * 0.7),
  );

  /* --- Åbningsanimation --- */
  useEffect(() => {
    const aspect = aspectRef.current;

    if (origin && !reducedMotion) {
      const from = flipTransform(origin, aspect);
      flipX.set(from.x);
      flipY.set(from.y);
      flipScale.set(from.scale);
      animate(flipX, 0, SPRING);
      animate(flipY, 0, SPRING);
      animate(flipScale, 1, SPRING);
    }

    animate(backdrop, 1, { duration: reducedMotion ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] });
    // Kun ved montering — åbningen skal ikke gentages ved skift af billede.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- Lukning: billedet foldes tilbage i sit miniaturebillede --- */
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);

    const target = resolveOrigin?.(index) ?? (index === startIndex ? origin : undefined);
    const finish = () => onClose();

    if (target && !reducedMotion && zoom === 1) {
      const to = flipTransform(target, aspectRef.current);
      animate(flipX, to.x + dragX.get(), SPRING_SNAPPY);
      animate(flipY, to.y + dragY.get(), SPRING_SNAPPY);
      animate(dragX, 0, SPRING_SNAPPY);
      animate(dragY, 0, SPRING_SNAPPY);
      animate(flipScale, to.scale, SPRING_SNAPPY);
      animate(backdrop, 0, { duration: 0.32, ease: 'easeIn' });
      window.setTimeout(finish, 300);
    } else {
      animate(backdrop, 0, { duration: reducedMotion ? 0.01 : 0.22 });
      window.setTimeout(finish, reducedMotion ? 10 : 200);
    }
  }, [closing, index, startIndex, origin, resolveOrigin, reducedMotion, zoom, onClose]);

  /* --- Navigation --- */
  const goTo = useCallback(
    (next: number) => {
      if (!count) return;
      const wrapped = (next + count) % count;
      setIndex(wrapped);
      setZoom(1);
      dragX.set(0);
      dragY.set(0);
      flipX.set(0);
      flipY.set(0);
      flipScale.set(1);
      onIndexChange?.(wrapped);
    },
    [count, onIndexChange],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const slideshow = useSlideshow(true, next);

  /* --- Tastatur --- */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          zoom > 1 ? setZoom(1) : close();
          break;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          prev();
          break;
        case 'Home':
          event.preventDefault();
          goTo(0);
          break;
        case 'End':
          event.preventDefault();
          goTo(count - 1);
          break;
        case ' ':
          event.preventDefault();
          slideshow.toggle();
          break;
        case 'z':
        case 'Z':
          setZoom((value) => (value > 1 ? 1 : 2.4));
          break;
        case 'i':
        case 'I':
          setShowInfo((value) => !value);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, next, prev, goTo, count, zoom, slideshow]);

  /* --- Fuldskærm --- */
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  /* --- Filmstrimlen følger det aktive billede --- */
  useEffect(() => {
    const strip = filmstripRef.current;
    const active = strip?.querySelector<HTMLElement>(`[data-strip-index="${index}"]`);
    if (!strip || !active) return;
    strip.scrollTo({
      left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [index, reducedMotion]);

  /* --- Træk: vandret skifter billede, lodret lukker --- */
  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (zoom > 1) return;
      const { offset, velocity } = info;

      if (Math.abs(offset.y) > 130 || Math.abs(velocity.y) > 780) {
        if (Math.abs(offset.y) > Math.abs(offset.x)) {
          close();
          return;
        }
      }

      const threshold = Math.min(120, window.innerWidth * 0.18);
      if (offset.x < -threshold || velocity.x < -600) {
        next();
        return;
      }
      if (offset.x > threshold || velocity.x > 600) {
        prev();
        return;
      }

      animate(dragX, 0, SPRING_SNAPPY);
      animate(dragY, 0, SPRING_SNAPPY);
    },
    [zoom, close, next, prev],
  );

  const onWheel = useCallback((event: React.WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((value) => Math.min(5, Math.max(1, value - event.deltaY * 0.01)));
  }, []);

  const caption = photo?.caption ?? photo?.alt ?? '';
  const hasMeta = Boolean(photo?.location || photo?.takenAt || photo?.credit || photo?.contextTitle);

  const stageStyle = useMemo(
    () => ({
      top: STAGE.top,
      bottom: STAGE.bottom,
    }),
    [],
  );

  const zoomed = zoom > 1;

  /** Ved zoom holdes panoreringen inden for billedets faktiske udstrækning. */
  const panConstraints = useMemo(() => {
    if (!zoomed || typeof window === 'undefined') return undefined;
    const reach = (zoom - 1) / 2;
    return {
      left: -window.innerWidth * reach,
      right: window.innerWidth * reach,
      top: -window.innerHeight * reach,
      bottom: window.innerHeight * reach,
    };
  }, [zoomed, zoom]);

  if (!photo) return null;

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Galleri: ${title}` : 'Billedgalleri'}
      tabIndex={-1}
      className="fixed inset-0 z-[100] select-none outline-none"
      onWheel={onWheel}
    >
      {/* Baggrund: varm mørk tone + billedets egen farve som ambient lys */}
      <motion.div
        className="absolute inset-0 bg-[#17130f]"
        style={{ opacity: zoomed ? backdrop : backdropOpacity }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ opacity: zoomed ? backdrop : backdropOpacity }}
        aria-hidden="true"
      >
        <AnimatePresence>
          <motion.img
            key={photo.src}
            src={photo.src}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-[80px] saturate-150"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(12,9,7,0.85)_100%)]" />
      </motion.div>

      {/* Sidehoved */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.4 }}
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-4 py-4 md:px-7"
      >
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/55">
            {title ?? 'Galleri'}
          </p>
          <p className="mt-0.5 font-[--font-display] text-sm text-white/90 tabular-nums">
            {index + 1} <span className="text-white/40">/ {count}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {hasMeta && (
            <ToolbarButton
              label={showInfo ? 'Skjul info' : 'Vis info'}
              active={showInfo}
              onClick={() => setShowInfo((value) => !value)}
            >
              <IconInfo />
            </ToolbarButton>
          )}
          <ToolbarButton
            label={zoom > 1 ? 'Zoom ud' : 'Zoom ind'}
            active={zoom > 1}
            onClick={() => setZoom((value) => (value > 1 ? 1 : 2.4))}
          >
            {zoom > 1 ? <IconZoomOut /> : <IconZoomIn />}
          </ToolbarButton>
          {count > 1 && (
            <ToolbarButton
              label={slideshow.playing ? 'Stop diasshow' : 'Start diasshow'}
              active={slideshow.playing}
              onClick={slideshow.toggle}
              progress={slideshow.playing ? slideshow.progress : undefined}
            >
              {slideshow.playing ? <IconPause /> : <IconPlay />}
            </ToolbarButton>
          )}
          <ToolbarButton
            label={isFullscreen ? 'Forlad fuldskærm' : 'Fuldskærm'}
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex"
          >
            <IconExpand />
          </ToolbarButton>
          <ToolbarButton label="Luk galleri" onClick={close}>
            <IconClose />
          </ToolbarButton>
        </div>
      </motion.header>

      {/* Scenen med billedet */}
      <div ref={stageRef} className="absolute inset-x-0 z-10" style={stageStyle}>
        <motion.div
          className="relative flex h-full w-full items-center justify-center px-3 md:px-[92px]"
          drag={zoomed || count > 1 ? true : 'y'}
          dragElastic={zoomed ? 0.04 : 0.28}
          dragConstraints={panConstraints}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          style={{ x: dragX, y: dragY, touchAction: 'none', cursor: zoomed ? 'grab' : 'auto' }}
        >
          <motion.div
            className="relative flex max-h-full max-w-full items-center justify-center"
            style={{
              x: flipX,
              y: flipY,
              /* Ved zoom er lodret træk panorering — ikke en lukkegestus. */
              scale: zoomed ? 1 : dismissScale,
              opacity: zoomed ? 1 : dismissOpacity,
            }}
          >
            <motion.div style={{ scale: flipScale }} className="relative">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.img
                  key={photo.src}
                  ref={(node) => {
                    if (node?.naturalWidth) {
                      aspectRef.current = node.naturalWidth / node.naturalHeight;
                    }
                  }}
                  src={photo.src}
                  alt={photo.alt}
                  draggable={false}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: zoom }}
                  exit={{ opacity: 0, position: 'absolute' }}
                  transition={{ opacity: { duration: 0.28 }, scale: SPRING }}
                  onDoubleClick={() => setZoom((value) => (value > 1 ? 1 : 2.4))}
                  onLoad={(event) => {
                    const node = event.currentTarget;
                    aspectRef.current = node.naturalWidth / node.naturalHeight;
                    setLoaded((state) => ({ ...state, [index]: true }));
                  }}
                  style={{
                    maxHeight: `calc(100vh - ${STAGE.top + STAGE.bottom}px)`,
                    backgroundColor: photo.dominantColor ?? 'transparent',
                  }}
                  className="max-w-full rounded-[3px] object-contain shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
                />
              </AnimatePresence>

              {!loaded[index] && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {count > 1 && (
          <>
            <EdgeButton side="left" onClick={prev} label="Forrige billede" />
            <EdgeButton side="right" onClick={next} label="Næste billede" />
          </>
        )}
      </div>

      {/* Billedtekst, info og filmstrimmel */}
      <motion.footer
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.45 }}
        className="absolute inset-x-0 bottom-0 z-20"
      >
        <AnimatePresence initial={false}>
          {showInfo && hasMeta && (
            <motion.div
              key="info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden px-4 md:px-7"
            >
              <dl className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-white/[0.06] px-5 py-4 text-[0.8rem] backdrop-blur-md">
                {photo.location && <Meta label="Sted" value={photo.location} />}
                {photo.takenAt && <Meta label="Optaget" value={photo.takenAt} />}
                {photo.credit && <Meta label="Foto" value={photo.credit} />}
                {photo.contextTitle && (
                  <Meta
                    label="Fra"
                    value={
                      photo.href ? (
                        <a className="underline underline-offset-2" href={photo.href}>
                          {photo.contextTitle}
                        </a>
                      ) : (
                        photo.contextTitle
                      )
                    }
                  />
                )}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>

        {caption && (
          <p className="mx-auto mb-3 max-w-3xl px-6 text-center text-[0.9rem] leading-relaxed text-white/80">
            {caption}
          </p>
        )}

        {count > 1 && (
          <div
            ref={filmstripRef}
            className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:px-7 [&::-webkit-scrollbar]:hidden"
          >
            {photos.map((item, itemIndex) => (
              <button
                key={`${item.src}-${itemIndex}`}
                type="button"
                data-strip-index={itemIndex}
                onClick={() => goTo(itemIndex)}
                aria-label={`Gå til billede ${itemIndex + 1}`}
                aria-current={itemIndex === index}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-all duration-300 ${
                  itemIndex === index
                    ? 'opacity-100 ring-2 ring-white/90'
                    : 'opacity-40 hover:opacity-80'
                }`}
              >
                <img
                  src={item.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </motion.footer>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Små byggeklodser                                                    */
/* ------------------------------------------------------------------ */

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.6rem] uppercase tracking-[0.18em] text-white/45">{label}</dt>
      <dd className="mt-0.5 text-white/90">{value}</dd>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
  active,
  progress,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  progress?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:bg-white/12 hover:text-white ${
        active ? 'bg-white/15 text-white' : ''
      } ${className}`}
    >
      {progress !== undefined && (
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.9"
            strokeDasharray={113}
            strokeDashoffset={113 * (1 - progress)}
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

function EdgeButton({
  side,
  onClick,
  label,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group absolute top-0 z-20 hidden h-full w-[92px] items-center justify-center md:flex ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/8 text-white/70 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-white/18 group-hover:text-white">
        {side === 'left' ? <IconChevronLeft /> : <IconChevronRight />}
      </span>
    </button>
  );
}

/* Ikoner — enkle stregtegninger, samme vægt som resten af sitet. */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const IconClose = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
    <path d="M15 18 9 12l6-6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...stroke}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const IconZoomIn = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5M11 8v6M8 11h6" />
  </svg>
);

const IconZoomOut = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5M8 11h6" />
  </svg>
);

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

const IconPause = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <path d="M9 5v14M15 5v14" />
  </svg>
);

const IconExpand = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

const IconInfo = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
