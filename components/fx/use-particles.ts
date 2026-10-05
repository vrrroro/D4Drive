'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { particlesSupported, runParticles, type ParticleOptions } from './particle-stage';

export type Tuning = Partial<ParticleOptions> & { duration?: number };

const PIXEL_RATIO = () => Math.min(window.devicePixelRatio || 1, 2);

/**
 * Embedding the webfonts is almost the entire cost of a capture: every face
 * has to be inlined as a data URI. html-to-image's own embedder fetches every
 * @font-face in the stylesheet, which with next/font means the latin-ext,
 * cyrillic, and vietnamese subsets too, a dozen files the page never uses.
 * This keeps only faces with no unicode-range or one covering basic latin,
 * which are the files already loaded and cached. Resolved once per page.
 */
let fontEmbedCache: Promise<string> | null = null;

const LATIN = /U\+0+-0*FF\b/i;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function buildFontEmbedCss(): Promise<string> {
  const faces: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // A cross-origin sheet. There are none today; skip if added.
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const range = rule.style.getPropertyValue('unicode-range');
      if (!range || LATIN.test(range)) faces.push(rule);
    }
  }

  const inlined = await Promise.all(
    faces.map(async (face) => {
      let css = face.cssText;
      for (const [, url] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if (!url || url.startsWith('data:')) continue;
        const response = await fetch(new URL(url, window.location.href));
        css = css.replace(url, await readAsDataUrl(await response.blob()));
      }
      return css;
    }),
  );
  return inlined.join('\n');
}

function embeddedFonts(): Promise<string> {
  fontEmbedCache ??= buildFontEmbedCss().catch((error: unknown) => {
    console.warn('[particles] font embed failed; capture uses fallback fonts', error);
    return '';
  });
  return fontEmbedCache;
}

/**
 * Rasterises a live DOM subtree so the particle stage can sample it.
 *
 * `style` is applied to the clone only, which is how an element that is
 * currently invisible (waiting to assemble) can still be photographed.
 * Returns null on any failure; every caller has a CSS fallback.
 *
 * Two things do not survive rasterisation: `::placeholder` text and
 * `backdrop-filter`. Keep both out of anything that gets captured.
 */
export async function captureElement(
  el: HTMLElement,
  style?: Partial<CSSStyleDeclaration>,
): Promise<HTMLCanvasElement | null> {
  try {
    const [{ toCanvas }, fontEmbedCSS] = await Promise.all([
      import('html-to-image'),
      embeddedFonts(),
    ]);
    const canvas = await toCanvas(el, {
      pixelRatio: PIXEL_RATIO(),
      cacheBust: false,
      fontEmbedCSS,
      style,
      // Anything marked data-no-capture is chrome, not content.
      filter: (node) => !(node instanceof HTMLElement) || node.dataset.noCapture === undefined,
    });
    return canvas.width > 0 && canvas.height > 0 ? canvas : null;
  } catch (error) {
    console.warn('[particles] capture failed, using CSS fallback', error);
    return null;
  }
}

/**
 * Captures run one at a time, each started when the main thread is idle.
 *
 * A capture clones and serialises a DOM subtree, which is real main-thread
 * work. Nine catalog cards intersecting at once would otherwise stack into a
 * single long task right after load, exactly when a visitor first reaches
 * for a filter, and that shows up directly in INP.
 */
let captureQueue: Promise<unknown> = Promise.resolve();

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 500 });
    } else {
      window.setTimeout(resolve, 50);
    }
  });
}

function queueCapture(
  el: HTMLElement,
  style?: Partial<CSSStyleDeclaration>,
): Promise<HTMLCanvasElement | null> {
  const run = captureQueue.then(whenIdle).then(() => captureElement(el, style));
  captureQueue = run.catch(() => null);
  return run;
}

/**
 * Resolves the font embed on idle while the visitor is still reading, so the
 * capture at the moment of success is not what stalls the frame.
 */
export function usePrewarmCapture(ref: RefObject<HTMLElement | null>, when = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!when || !el || !particlesSupported()) return undefined;
    const run = () => void embeddedFonts();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 600);
    return () => window.clearTimeout(id);
  }, [ref, when]);
}

/**
 * Dissolves a DOM subtree into drifting sand.
 *
 * Resolves when the element is gone, by particles or by the CSS fallback.
 * The real element is hidden on the frame after the stage draws its first
 * (pixel-identical) particle frame: earlier would flash a gap, later would
 * double the image.
 */
export function useParticleDissolve<T extends HTMLElement>(
  ref: RefObject<T | null>,
  tuning: Tuning = {},
  fallbackMs = 500,
) {
  const [ghosted, setGhosted] = useState(false);
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  const dissolve = useCallback(async (): Promise<void> => {
    const el = ref.current;
    if (!el) return;

    const { duration = 1.5, ...options } = tuningRef.current;
    const rect = el.getBoundingClientRect();
    const plate = particlesSupported() ? await captureElement(el) : null;

    const fade = async () => {
      // Opacity only: DESIGN.md animates transform and opacity, nothing else.
      el.style.transition = `opacity ${fallbackMs}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      el.style.opacity = '0';
      setGhosted(true);
      await new Promise((resolve) => setTimeout(resolve, fallbackMs));
    };

    if (!plate) return fade();

    setGhosted(true);
    await new Promise<void>((resolve) => {
      const cancel = runParticles({
        source: plate,
        // The plate is frozen at capture time, so the rect is frozen with it.
        rect: () => rect,
        mode: 'dissolve',
        duration,
        fit: 'fill',
        onDone: resolve,
        ...options,
      });
      if (!cancel) {
        void fade().then(resolve);
        return;
      }
      requestAnimationFrame(() => {
        el.style.visibility = 'hidden';
      });
    });
  }, [ref, fallbackMs]);

  return { ghosted, dissolve };
}

/**
 * Condenses an element out of sand the first time it scrolls into view.
 *
 * The element is server-rendered with `data-assemble="pending"`. globals.css
 * hides that only when scripting is on and motion is welcome, with a CSS
 * failsafe that shows it after a few seconds, so no-JS, reduced motion, and a
 * hydration that never arrives all still show the content. Once this hook
 * runs it moves the element to `armed` (hidden, no failsafe: JS is alive and
 * owns the reveal), then `running`, then `done`.
 *
 * The state lives in a data attribute, not React state: nothing re-renders
 * while a grid of cards assembles.
 */
export function useParticleAssemble(
  ref: RefObject<HTMLElement | null>,
  { delay = 0, ...tuning }: Tuning & { delay?: number } = {},
): void {
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const settle = () => {
      el.dataset.assemble = 'done';
    };

    // The failsafe already revealed it, or there is nothing to assemble with.
    if (!particlesSupported() || getComputedStyle(el).opacity === '1') {
      settle();
      return undefined;
    }

    el.dataset.assemble = 'armed';

    let cancel: (() => void) | null = null;
    let safety = 0;
    let disposed = false;

    const start = async () => {
      el.dataset.assemble = 'running';
      const plate = await queueCapture(el, { opacity: '1', animation: 'none' });
      if (disposed) return;
      if (!plate) return settle();

      const { duration = 1.6, ...options } = tuningRef.current;
      cancel = runParticles({
        source: plate,
        rect: () => el.getBoundingClientRect(),
        mode: 'assemble',
        duration: duration + delay,
        fit: 'fill',
        onDone: () => {
          window.clearTimeout(safety);
          settle();
        },
        ...options,
      });
      if (!cancel) return settle();
      // A hidden tab freezes rAF and a lost context never reports back. The
      // content must not be stranded invisible either way.
      safety = window.setTimeout(settle, (duration + delay + 4) * 1000);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void start();
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    observer.observe(el);

    // No settle here. On a real unmount the element is gone; under Strict
    // Mode's double effect the element must stay armed for the second run.
    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(safety);
      cancel?.();
    };
  }, [ref, delay]);
}
