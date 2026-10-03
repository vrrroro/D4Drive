import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import {
  particlesSupported,
  runParticles,
  type ParticleOptions,
} from "./particle-stage";

type Tuning = Partial<ParticleOptions> & { duration?: number };

const PIXEL_RATIO = () => Math.min(window.devicePixelRatio || 1, 2);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Embedding the webfonts is almost the entire cost of a capture — every face is
 * fetched and inlined as a data URI, which measured over 5s cold. It is also
 * identical for every capture on the page, so it is resolved once and reused.
 */
let fontEmbedCache: Promise<string> | null = null;

function embeddedFonts(el: HTMLElement) {
  fontEmbedCache ??= getFontEmbedCSS(el).catch((err) => {
    console.warn("[d4drive] font embed failed; capture will use fallbacks", err);
    return "";
  });
  return fontEmbedCache;
}

/**
 * Rasterise a live DOM subtree so it can be handed to the particle stage.
 *
 * Fonts are bundled locally (@fontsource) rather than pulled from a CDN
 * precisely so this stays same-origin and the embed step cannot fail on CORS.
 * Returns null on any failure — every caller has a CSS fallback.
 */
export async function captureElement(
  el: HTMLElement,
): Promise<HTMLCanvasElement | null> {
  try {
    const canvas = await toCanvas(el, {
      pixelRatio: PIXEL_RATIO(),
      cacheBust: false,
      fontEmbedCSS: await embeddedFonts(el),
      // Anything marked data-no-capture is chrome, not content.
      filter: (node) =>
        !(node instanceof HTMLElement) || node.dataset.noCapture === undefined,
    });
    return canvas.width > 0 && canvas.height > 0 ? canvas : null;
  } catch (err) {
    console.warn("[d4drive] element capture failed, using CSS fallback", err);
    return null;
  }
}

/**
 * Resolve the font embed while the visitor is still reading, so the capture at
 * the moment of submit is not the thing that stalls the frame.
 */
export function usePrewarmCapture(ref: React.RefObject<HTMLElement | null>, when = true) {
  useEffect(() => {
    if (!when || !ref.current || prefersReducedMotion()) return;
    const el = ref.current;
    const idle =
      window.requestIdleCallback?.(() => void embeddedFonts(el)) ??
      window.setTimeout(() => void embeddedFonts(el), 600);
    return () => {
      window.cancelIdleCallback?.(idle as number);
      clearTimeout(idle as number);
    };
  }, [ref, when]);
}

/**
 * Dissolve a DOM subtree into drifting sand.
 *
 * `ghosted` is exposed so the caller can also drop pointer-events and aria
 * visibility; the element itself is hidden imperatively on the same frame the
 * first grain is drawn, so there is never a double image.
 */
export function useParticleDissolve<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  tuning: Tuning = {},
) {
  const [ghosted, setGhosted] = useState(false);
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  const dissolve = useCallback(async () => {
    const el = ref.current;
    if (!el) return;

    const { duration = 1.5, ...options } = tuningRef.current;
    const rect = el.getBoundingClientRect();
    const plate =
      particlesSupported() && !prefersReducedMotion()
        ? await captureElement(el)
        : null;

    if (!plate) {
      // Graceful degradation: the moment still reads, just without the sand.
      el.style.transition = `opacity 900ms var(--ease-lux), filter 900ms var(--ease-lux), transform 900ms var(--ease-lux)`;
      el.style.opacity = "0";
      el.style.filter = "blur(14px)";
      el.style.transform = "scale(1.04)";
      setGhosted(true);
      await new Promise((r) => setTimeout(r, 900));
      return;
    }

    setGhosted(true);

    await new Promise<void>((resolve) => {
      const cancel = runParticles({
        source: plate,
        // The plate is frozen at capture time, so freeze the rect with it.
        rect: () => rect,
        mode: "dissolve",
        duration,
        fit: "fill",
        onDone: resolve,
        ...options,
      });
      if (!cancel) return resolve();
      // The stage queued its rAF first, so its opening frame — pixel-identical
      // to the element — is already drawn when this runs. Hiding any earlier
      // would flash a gap; any later would double the image.
      requestAnimationFrame(() => {
        el.style.visibility = "hidden";
      });
    });
  }, [ref]);

  return { ghosted, dissolve };
}

/**
 * Condense a still image out of sand once it scrolls into view.
 * Used for fleet photography — the picture arrives grain by grain while its
 * caption rises underneath.
 */
export function useParticleAssemble(
  ref: React.RefObject<HTMLImageElement | null>,
  { enabled = true, ...tuning }: Tuning & { enabled?: boolean } = {},
) {
  const [settled, setSettled] = useState(false);
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  const active = enabled && !prefersReducedMotion();

  // Hide before first paint, so the photograph is never briefly visible in one
  // piece before it scatters back apart.
  useLayoutEffect(() => {
    if (active && ref.current && particlesSupported()) {
      ref.current.style.visibility = "hidden";
    }
  }, [ref, active]);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    if (!active || !particlesSupported()) {
      img.style.visibility = "";
      setSettled(true);
      return;
    }

    let cancel: (() => void) | null = null;
    let started = false;
    let safety = 0;

    const reveal = () => {
      clearTimeout(safety);
      img.style.visibility = "";
      setSettled(true);
    };

    const start = () => {
      if (started || !img.complete || !img.naturalWidth) return;
      started = true;
      const { duration = 1.6, ...options } = tuningRef.current;
      cancel = runParticles({
        source: img,
        rect: () => img.getBoundingClientRect(),
        mode: "assemble",
        duration,
        fit: "cover",
        onDone: reveal,
        ...options,
      });
      if (!cancel) return reveal();
      // A hidden tab freezes rAF and a lost context never reports back. Either
      // way the photograph must not be left invisible, so back the job with a
      // deadline that shows it regardless.
      safety = window.setTimeout(reveal, (duration + 4) * 1000);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        if (img.complete) start();
        else img.addEventListener("load", start, { once: true });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    observer.observe(img);

    return () => {
      observer.disconnect();
      clearTimeout(safety);
      cancel?.();
      img.style.visibility = "";
    };
  }, [ref, active]);

  return settled;
}
