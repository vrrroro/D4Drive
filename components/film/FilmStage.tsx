'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { FILM_MANIFEST } from '@/lib/film-manifest';
import { FrameLoader } from './frame-loader';
import {
  FADE_OUT,
  LAST_BEAT,
  closedSlab,
  ease,
  filmAlpha,
  filmFrame,
  fitModeFor,
  frameAt,
  heroFraming,
  heroPush,
  placeFrame,
  slabAlpha,
  stageTone,
  windowRect,
  type FitMode,
  type Rect,
} from './timeline';

interface FilmStageProps {
  progress: MotionValue<number>;
  /** 0 to 1: the slab fading in on its own after the hero's entrance. */
  entrance: MotionValue<number>;
  stageRef: RefObject<HTMLDivElement | null>;
  toneRef: RefObject<HTMLDivElement | null>;
  onBootProgress: (fraction: number) => void;
}

/** The slab's colour when the stage does not say (globals.css `--film-slab`). */
const SLAB = '#121110';

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
 * Drawing is driven by events, not a loop: a change in scroll progress or in
 * the slab's entrance, a frame arriving, or a resize each request one
 * animation frame, and that frame draws once. Nothing here touches React
 * state; the progress value and the loader live outside the render cycle.
 *
 * Each draw also writes the three things the type and the page follow: the
 * push on the hero (`--hero-up`, `--hero-down`), the grey stage (the tone
 * layer's opacity), and the film's own fade.
 */
export function FilmStage({ progress, entrance, stageRef, toneRef, onBootProgress }: FilmStageProps) {
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
    let closed: Rect = closedSlab(1, 1, 0);
    let gap = { top: 0, bottom: 1 };
    let slabColour = SLAB;
    let ground = 'rgb(249, 248, 246)';
    let groundClear = 'rgba(249, 248, 246, 0)';
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
      const e = entrance.get();

      // The film and the grey stage fade back into the page together:
      // opacity only, and whether or not the frame itself changed.
      const fade = ease((p - FADE_OUT[0]) / (FADE_OUT[1] - FADE_OUT[0]));
      canvas.style.opacity = String(1 - fade);
      const tone = toneRef.current;
      if (tone) tone.style.opacity = stageTone(p).toFixed(3);

      const win = windowRect(p, mode, vw, vh, closed);
      const push = heroPush(p, gap, vh);
      const pushKey = `${push.up.toFixed(1)}|${push.down.toFixed(1)}`;
      if (pushKey !== lastPush) {
        stage.style.setProperty('--hero-up', `${push.up.toFixed(1)}px`);
        stage.style.setProperty('--hero-down', `${push.down.toFixed(1)}px`);
        lastPush = pushKey;
      }

      const slab = slabAlpha(p, e);
      const film = filmAlpha(p);
      const f = frameAt(p, FILM_MANIFEST.count);
      const i0 = Math.floor(f);
      const t = f - i0;
      const key = `${f.toFixed(3)}|${win.y.toFixed(1)}|${win.height.toFixed(1)}|${slab.toFixed(3)}|${vw}x${vh}`;
      if (key === lastKey) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      lastKey = key;
      if (slab <= 0) return;

      // The slab: black, appearing out of the blank space.
      ctx.globalAlpha = slab;
      ctx.fillStyle = slabColour;
      ctx.fillRect(win.x, win.y, win.width, win.height);

      // The film rises out of the black as the slab opens.
      const base = film > 0 ? (loader.exact(i0) ?? loader.nearest(i0)) : null;
      if (base) {
        const frameRect = filmFrame(mode, vw, vh);
        const focus = FILM_MANIFEST.focus[Math.min(FILM_MANIFEST.count - 1, Math.round(f))] ?? 0.5;
        const at = heroFraming(p, win, placeFrame(mode, frameRect, FILM_MANIFEST.width, FILM_MANIFEST.height, focus));

        ctx.save();
        ctx.beginPath();
        ctx.rect(win.x, win.y, win.width, win.height);
        ctx.clip();
        ctx.globalAlpha = slab * film;
        ctx.drawImage(base, at.dx, at.dy, at.dw, at.dh);
        // Between two stills, blend the next one in by the fraction. At 60
        // stills a second of film this reads as continuous motion.
        const next = t > 0.04 ? (loader.exact(i0 + step) ?? loader.exact(i0 + 1)) : null;
        if (next && next !== base) {
          ctx.globalAlpha = slab * film * t;
          ctx.drawImage(next, at.dx, at.dy, at.dw, at.dh);
        }
        ctx.restore();

        // On portrait the band dissolves into the page above and below it.
        // The clear end of each gradient is the ground colour at zero alpha:
        // fading to transparent black would draw a grey bar through the middle.
        if (mode === 'band' && film >= 1) {
          ctx.globalAlpha = 1;
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
    const measureGap = () => {
      const slogan = stage.querySelector<HTMLElement>('[data-hero-slogan]');
      const mark = stage.querySelector<HTMLElement>('[data-hero-wordmark]');
      if (!slogan || !mark) {
        gap = { top: vh * 0.43, bottom: vh * 0.6 };
        return closedSlab(vw, vh, vw * 0.06, gap);
      }
      const s = offsetWithin(slogan, stage);
      const m = offsetWithin(mark, stage);
      gap = { top: s.top + slogan.offsetHeight, bottom: m.top };
      return closedSlab(vw, vh, s.left, gap);
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
      const styles = getComputedStyle(stage);
      slabColour = styles.getPropertyValue('--film-slab').trim() || SLAB;
      const channels = styles.backgroundColor.match(/\d+(\.\d+)?/g);
      if (channels && channels.length >= 3) {
        const [r, g, b] = channels;
        ground = `rgb(${r}, ${g}, ${b})`;
        groundClear = `rgba(${r}, ${g}, ${b}, 0)`;
      }
      closed = measureGap();

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
    const offEntrance = entrance.on('change', () => request());
    loader.start();

    return () => {
      alive = false;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      offProgress();
      offEntrance();
      loader.dispose();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress, entrance, stageRef, toneRef]);

  return <canvas ref={canvasRef} aria-hidden="true" data-film-canvas className="film-canvas absolute inset-0" />;
}
