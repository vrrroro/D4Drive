'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { FILM_MANIFEST } from '@/lib/film-manifest';
import { FrameLoader } from './frame-loader';
import {
  BLOOM_CORE,
  FADE_OUT,
  LAST_BEAT,
  bloomAlpha,
  bloomAmount,
  bloomFraming,
  bloomShape,
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

/** The bloom's falloff past its solid core: [share of the way out, alpha], smoothstep. */
const FEATHER = [
  [0.25, 0.84],
  [0.5, 0.5],
  [0.75, 0.16],
] as const;

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
 * blooms the film out of the blank grey between the slogan and the wordmark,
 * seen through a soft ellipse with no edge (timeline.bloomShape) that grows
 * until the film fills the screen. At the end it fades back into the same
 * grey. Each draw also writes the push on the hero (`--hero-up`,
 * `--hero-down`).
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

      const push = heroPush(p, gap, vh);
      const pushKey = `${push.up.toFixed(1)}|${push.down.toFixed(1)}`;
      if (pushKey !== lastPush) {
        stage.style.setProperty('--hero-up', `${push.up.toFixed(1)}px`);
        stage.style.setProperty('--hero-down', `${push.down.toFixed(1)}px`);
        lastPush = pushKey;
      }

      const alpha = bloomAlpha(p);
      const bloom = bloomShape(p, mode, vw, vh, gap);
      const f = frameAt(p, FILM_MANIFEST.count);
      const i0 = Math.floor(f);
      const t = f - i0;
      const key = `${f.toFixed(3)}|${bloomAmount(p).toFixed(4)}|${alpha.toFixed(3)}|${vw}x${vh}`;
      if (key === lastKey) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, vw, vh);
      lastKey = key;
      if (alpha <= 0) return;

      const base = loader.exact(i0) ?? loader.nearest(i0);
      if (base) {
        const frameRect = filmFrame(mode, vw, vh);
        const focus = FILM_MANIFEST.focus[Math.min(FILM_MANIFEST.count - 1, Math.round(f))] ?? 0.5;
        const placed = placeFrame(mode, frameRect, FILM_MANIFEST.width, FILM_MANIFEST.height, focus);
        const at = bloom ? bloomFraming(p, placed, { x: bloom.cx, y: bloom.cy }) : placed;

        ctx.save();
        ctx.beginPath();
        ctx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
        ctx.clip();
        ctx.globalAlpha = alpha;
        ctx.drawImage(base, at.dx, at.dy, at.dw, at.dh);
        // Between two stills, blend the next one in by the fraction. At 60
        // stills a second of film this reads as continuous motion.
        const next = t > 0.04 ? (loader.exact(i0 + step) ?? loader.exact(i0 + 1)) : null;
        if (next && next !== base) {
          ctx.globalAlpha = alpha * t;
          ctx.drawImage(next, at.dx, at.dy, at.dw, at.dh);
        }
        ctx.restore();

        // While it blooms, keep only what lies inside the soft ellipse:
        // solid in the core, feathering out to nothing, so the film comes
        // out of the grey with no edge anywhere.
        if (bloom) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-in';
          ctx.translate(bloom.cx, bloom.cy);
          const squash = bloom.ry / bloom.rx;
          ctx.scale(1, squash);
          const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, bloom.rx);
          mask.addColorStop(0, 'rgba(0, 0, 0, 1)');
          mask.addColorStop(BLOOM_CORE, 'rgba(0, 0, 0, 1)');
          // A smoothstep falloff in a few stops, so the edge draws no line.
          for (const [along, a] of FEATHER) {
            mask.addColorStop(BLOOM_CORE + (1 - BLOOM_CORE) * along, `rgba(0, 0, 0, ${a})`);
          }
          mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = mask;
          ctx.fillRect(-bloom.cx - 2, (-bloom.cy - 2) / squash, vw + 4, (vh + 4) / squash);
          ctx.restore();
        }

        // On portrait the band dissolves into the page above and below it.
        // The clear end of each gradient is the ground colour at zero alpha:
        // fading to transparent black would draw a dark bar through the middle.
        if (mode === 'band' && !bloom) {
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
    const measureGap = (): Gap => {
      const slogan = stage.querySelector<HTMLElement>('[data-hero-slogan]');
      const mark = stage.querySelector<HTMLElement>('[data-hero-wordmark]');
      if (!slogan || !mark) return defaultGap(vh);
      const s = offsetWithin(slogan, stage);
      const m = offsetWithin(mark, stage);
      return { top: s.top + slogan.offsetHeight, bottom: m.top };
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
