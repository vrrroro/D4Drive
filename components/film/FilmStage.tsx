'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { FILM_MANIFEST } from '@/lib/film-manifest';
import { FrameLoader } from './frame-loader';
import {
  FADE_OUT,
  ease,
  filmFrame,
  fitModeFor,
  frameAt,
  heroFraming,
  placeFrame,
  windowRect,
  type FitMode,
} from './timeline';

interface FilmStageProps {
  progress: MotionValue<number>;
  stageRef: RefObject<HTMLDivElement | null>;
  onBootProgress: (fraction: number) => void;
}

/**
 * The canvas the film is drawn into.
 *
 * Drawing is driven by events, not a loop: a change in scroll progress, a
 * frame arriving, or a resize each request one animation frame, and that
 * frame draws once. Nothing here touches React state; the progress value and
 * the loader live outside the render cycle.
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
    let ground = 'rgb(249, 248, 246)';
    let groundClear = 'rgba(249, 248, 246, 0)';
    let raf = 0;
    let lastKey = '';

    // Phones scrub every other frame: half the bytes, and at a thumb's
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

      // The smoke fades into the page: opacity only, and independent of
      // whether the frame itself changed (the last still holds while it fades).
      const fade = ease((p - FADE_OUT[0]) / (FADE_OUT[1] - FADE_OUT[0]));
      canvas.style.opacity = String(1 - fade);

      const f = frameAt(p);
      const i0 = Math.floor(f);
      const t = f - i0;
      const win = windowRect(p, mode, vw, vh);
      const key = `${f.toFixed(3)}|${win.x.toFixed(1)}|${win.width.toFixed(1)}|${vw}x${vh}`;
      if (key === lastKey) return;

      const base = loader.exact(i0) ?? loader.nearest(i0);
      if (!base) return;
      lastKey = key;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      const film = filmFrame(mode, vw, vh);
      const focus = FILM_MANIFEST.focus[Math.min(FILM_MANIFEST.count - 1, Math.round(f))] ?? 0.5;
      const at = heroFraming(p, win, placeFrame(mode, film, FILM_MANIFEST.width, FILM_MANIFEST.height, focus));

      ctx.save();
      ctx.beginPath();
      ctx.rect(win.x, win.y, win.width, win.height);
      ctx.clip();
      ctx.globalAlpha = 1;
      ctx.drawImage(base, at.dx, at.dy, at.dw, at.dh);
      // Between two stills, blend the next one in by the fraction. At 30
      // stills a second of film this reads as continuous motion, not steps.
      const next = t > 0.04 ? loader.exact(i0 + step) ?? loader.exact(i0 + 1) : null;
      if (next && next !== base) {
        ctx.globalAlpha = t;
        ctx.drawImage(next, at.dx, at.dy, at.dw, at.dh);
      }
      ctx.restore();

      // On portrait the band dissolves into the page above and below it.
      // The clear end of each gradient is the ground colour at zero alpha:
      // fading to transparent black would draw a grey bar through the middle.
      if (mode === 'band') {
        const edge = film.height * 0.12;
        const top = ctx.createLinearGradient(0, film.y, 0, film.y + edge);
        top.addColorStop(0, ground);
        top.addColorStop(1, groundClear);
        ctx.fillStyle = top;
        ctx.fillRect(0, film.y - 1, vw, edge + 1);
        const bottom = ctx.createLinearGradient(0, film.y + film.height - edge, 0, film.y + film.height);
        bottom.addColorStop(0, groundClear);
        bottom.addColorStop(1, ground);
        ctx.fillStyle = bottom;
        ctx.fillRect(0, film.y + film.height - edge, vw, edge + 1);
      }

      canvas.dataset.frame = String(Math.round(f));
    };

    function request(force = false) {
      if (force) lastKey = '';
      if (!raf) raf = requestAnimationFrame(draw);
    }

    const resize = () => {
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

      // Publish the geometry so the hero's type and the chapters line up
      // with the canvas exactly, whatever the viewport.
      const closed = windowRect(0, mode, vw, vh);
      const film = filmFrame(mode, vw, vh);
      const set = (name: string, value: number) => stage.style.setProperty(name, `${value.toFixed(1)}px`);
      set('--win-x', closed.x);
      set('--win-y', closed.y);
      set('--win-w', closed.width);
      set('--win-h', closed.height);
      set('--film-y', film.y);
      set('--film-h', film.height);
      stage.dataset.fit = mode;
      request(true);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    window.addEventListener('resize', resize);
    const unsubscribe = progress.on('change', () => request());
    loader.start();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      unsubscribe();
      loader.dispose();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress, stageRef]);

  return <canvas ref={canvasRef} aria-hidden="true" data-film-canvas className="film-canvas absolute inset-0" />;
}
