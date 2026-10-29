'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { FILM_MANIFEST } from '@/lib/film-manifest';
import { FrameLoader } from './frame-loader';
import {
  FADE_OUT,
  LAST_BEAT,
  cutAmount,
  cutEdges,
  cutFraming,
  defaultGap,
  ease,
  filmFrame,
  fitModeFor,
  frameAt,
  heroPush,
  placeFrame,
  type FitMode,
  type Gap,
} from './timeline';

interface FilmStageProps {
  progress: MotionValue<number>;
  stageRef: RefObject<HTMLDivElement | null>;
  onBootProgress: (fraction: number) => void;
}

/** Layout position of `el` inside `ancestor`, ignoring transforms. */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement): { top: number; left: number } {
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { top, left };
}

/**
 * The canvas the film is drawn into.
 *
 * Drawing is driven by events, not a loop: a change in scroll progress, a
 * frame arriving, or a resize each request one animation frame, and that
 * frame draws once. Nothing here touches React
 * state; the progress value and the loader live outside the render cycle.
 *
 * The page is the film's own studio grey, so nothing is drawn behind the
 * picture. At the top of the page nothing is drawn at all; the first scroll
 * cuts the blank grey between the slogan and the wordmark open across the
 * whole width (timeline.cutEdges), and the cut's edges move apart until the
 * film fills its rectangle. At the end it fades back into the same grey.
 * Each draw also writes the push on the hero (`--hero-up`, `--hero-down`),
 * so the type rides on the cut's edges.
 */
export function FilmStage({ progress, stageRef, onBootProgress }: FilmStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bootRef = useRef(onBootProgress);
  bootRef.current = onBootProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !stage || !ctx) return undefined;

    let vw = 0;
    let vh = 0;
    let dpr = 1;
    let mode: FitMode = 'cover';
    let gap: Gap = defaultGap(1);
    let ground = 'rgb(189, 188, 186)';
    let groundClear = 'rgba(189, 188, 186, 0)';
    let raf = 0;
    let lastKey = '';
    let lastPush = '';

    // Phones scrub every other still: half the bytes, and at a thumb's
    // scrolling speed the difference does not show.
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const step: 1 | 2 = coarsePointer && Math.min(window.innerWidth, window.innerHeight) < 820 ? 2 : 1;

    const loader = new FrameLoader(
      step,
      () => request(true),
      (fraction) => bootRef.current(fraction),
    );

    const draw = () => {
      raf = 0;
      const p = progress.get();

      // The film fades back into the page: opacity only, and whether or not
      // the frame itself changed.
      const fade = ease((p - FADE_OUT[0]) / (FADE_OUT[1] - FADE_OUT[0]));
      canvas.style.opacity = String(1 - fade);

      const push = heroPush(p, mode, vw, vh, gap);
      const pushKey = `${push.up.toFixed(1)}|${push.down.toFixed(1)}`;
      if (pushKey !== lastPush) {
        stage.style.setProperty('--hero-up', `${push.up.toFixed(1)}px`);
        stage.style.setProperty('--hero-down', `${push.down.toFixed(1)}px`);
        lastPush = pushKey;
      }

      const opened = cutAmount(p);
      const cut = cutEdges(p, mode, vw, vh, gap);
      const f = frameAt(p, FILM_MANIFEST.count);
      const i0 = Math.floor(f);
      const t = f - i0;
      const key = `${f.toFixed(3)}|${opened.toFixed(4)}|${vw}x${vh}`;
      if (key === lastKey) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      lastKey = key;
      // Closed: the gap is plain page.
      if (cut && cut.bottom - cut.top < 0.5) return;

      const base = loader.exact(i0) ?? loader.nearest(i0);
      if (base) {
        const frameRect = filmFrame(mode, vw, vh);
        const focus = FILM_MANIFEST.focus[Math.min(FILM_MANIFEST.count - 1, Math.round(f))] ?? 0.5;
        const placed = placeFrame(mode, frameRect, FILM_MANIFEST.width, FILM_MANIFEST.height, focus);
        const at = cut ? cutFraming(p, placed, { x: vw / 2, y: (cut.top + cut.bottom) / 2 }) : placed;

        // The film is seen through the cut: a clean edge, the whole width,
        // between its two edges; once open, through its own rectangle.
        ctx.save();
        ctx.beginPath();
        if (cut) ctx.rect(0, cut.top, vw, cut.bottom - cut.top);
        else ctx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
        ctx.clip();
        ctx.globalAlpha = 1;
        ctx.drawImage(base, at.dx, at.dy, at.dw, at.dh);
        // Between two stills, blend the next one in by the fraction. At 60
        // stills a second of film this reads as continuous motion.
        const next = t > 0.04 ? (loader.exact(i0 + step) ?? loader.exact(i0 + 1)) : null;
        if (next && next !== base) {
          ctx.globalAlpha = t;
          ctx.drawImage(next, at.dx, at.dy, at.dw, at.dh);
        }
        ctx.restore();

        // On portrait the band dissolves into the page above and below it.
        // The clear end of each gradient is the ground colour at zero alpha:
        // fading to transparent black would draw a dark bar through the middle.
        // The fades come up over the end of the cut, not all at once after it.
        if (mode === 'band' && opened > 0.7) {
          ctx.globalAlpha = (opened - 0.7) / 0.3;
          const edge = frameRect.height * 0.12;
          const top = ctx.createLinearGradient(0, frameRect.y, 0, frameRect.y + edge);
          top.addColorStop(0, ground);
          top.addColorStop(1, groundClear);
          ctx.fillStyle = top;
          ctx.fillRect(0, frameRect.y - 1, vw, edge + 1);
          const bottom = ctx.createLinearGradient(0, frameRect.y + frameRect.height - edge, 0, frameRect.y + frameRect.height);
          bottom.addColorStop(0, groundClear);
          bottom.addColorStop(1, ground);
          ctx.fillStyle = bottom;
          ctx.fillRect(0, frameRect.y + frameRect.height - edge, vw, edge + 1);
        }

        // Keep the next few stills in the direction of travel decoded, so
        // the first draw of each is not a decode on the main thread.
        loader.warm(i0, step);
      }
      ctx.globalAlpha = 1;
      canvas.dataset.frame = String(Math.round(f));
      // The film position in beats (30 a second), whatever the cut: the smoke test reads it.
      canvas.dataset.beat = String(Math.round((f / (FILM_MANIFEST.count - 1)) * LAST_BEAT));
    };

    function request(force = false) {
      if (force) lastKey = '';
      if (!raf) raf = requestAnimationFrame(draw);
    }

    /** The blank space between the slogan and the wordmark, as laid out. */
    const measureGap = (): Gap => {
      const slogan = stage.querySelector<HTMLElement>('[data-hero-slogan]');
      const mark = stage.querySelector<HTMLElement>('[data-hero-wordmark]');
      if (!slogan || !mark) return defaultGap(vh);
      const s = offsetWithin(slogan, stage);
      const m = offsetWithin(mark, stage);
      // The slogan's crushed leading lets its descenders (the y of "you.")
      // hang below its box; the cut must clear them too.
      const descender = parseFloat(getComputedStyle(slogan.querySelector('h1') ?? slogan).fontSize) * 0.3 || 0;
      return { top: s.top + slogan.offsetHeight + descender, bottom: m.top };
    };

    let alive = true;
    const resize = () => {
      if (!alive) return;
      const rect = stage.getBoundingClientRect();
      vw = Math.max(1, Math.round(rect.width));
      vh = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      mode = fitModeFor(vw, vh);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      const channels = getComputedStyle(stage).backgroundColor.match(/\d+(\.\d+)?/g);
      if (channels && channels.length >= 3) {
        const [r, g, b] = channels;
        ground = `rgb(${r}, ${g}, ${b})`;
        groundClear = `rgba(${r}, ${g}, ${b}, 0)`;
      }
      gap = measureGap();

      // Publish the geometry so the chapters line up with the canvas exactly,
      // whatever the viewport.
      const film = filmFrame(mode, vw, vh);
      const set = (name: string, value: number) => stage.style.setProperty(name, `${value.toFixed(1)}px`);
      set('--film-y', film.y);
      set('--film-h', film.height);
      stage.dataset.fit = mode;
      lastPush = '';
      request(true);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    // The fonts change the slogan's and the wordmark's size once they land.
    void document.fonts?.ready.then(resize);
    window.addEventListener('resize', resize);
    const offProgress = progress.on('change', () => request());
    loader.start();

    return () => {
      alive = false;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      offProgress();
      loader.dispose();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress, stageRef]);

  return <canvas ref={canvasRef} aria-hidden="true" data-film-canvas className="film-canvas absolute inset-0" />;
}
