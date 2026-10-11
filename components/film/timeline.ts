/**
 * The landing film's timeline.
 *
 * Pure functions over plain numbers: scroll progress in, film frame and layer
 * geometry out. No DOM, no React, so the whole choreography is unit tested
 * (tests/film-timeline.test.ts) and FilmStage only has to draw what it is told.
 *
 * Progress `p` runs 0 to 1 across the pinned track. Film positions are given
 * in beats: the source film's own frames at 30 a second, 0 to 263, from 1.25s
 * in. `frameAt` scales beats to however many stills the manifest has (264 at
 * 30 a second, 528 at 60), so the choreography does not change with the cut.
 * See docs/VIDEO_STATE_MACHINE.md for the contract.
 */

/** The film's last beat (its last frame at 30 a second). */
export const LAST_BEAT = 263;

/**
 * Scroll-to-film mapping. Moving segments play the film; holds (both ends on
 * the same beat) stop it on a finished shot so its copy can be read, and the
 * scroll carries on until the next shot begins.
 */
export const SEGMENTS: ReadonlyArray<{ from: number; to: number; beats: [number, number] }> = [
  // A black slab fades in between the slogan and the wordmark.
  { from: 0, to: 0.012, beats: [0, 0] },
  // It opens out to the whole screen; the film rises out of the black.
  { from: 0.012, to: 0.07, beats: [0, 12] },
  // The camera pulls back along the flank.
  { from: 0.07, to: 0.19, beats: [12, 80] },
  // Hold: the whole car, side on.
  { from: 0.19, to: 0.28, beats: [80, 80] },
  // The car turns to face you.
  { from: 0.28, to: 0.4, beats: [80, 120] },
  // Hold: head-on.
  { from: 0.4, to: 0.49, beats: [120, 120] },
  // It keeps turning: front three-quarter, toward its right flank.
  { from: 0.49, to: 0.59, beats: [120, 176] },
  // Hold: three-quarter, facing right.
  { from: 0.59, to: 0.68, beats: [176, 176] },
  // Burnout and take-off: it leaves frame right through its own smoke.
  { from: 0.68, to: 0.8, beats: [176, LAST_BEAT] },
  // Hold on the smoke, then the whole stage fades back into the page.
  { from: 0.8, to: 1, beats: [LAST_BEAT, LAST_BEAT] },
];

/** The slab fades in over this range, if the entrance has not already shown it. */
export const SLAB_IN: readonly [number, number] = [0, 0.012];

/** The slab opens out to the full film rectangle between these two points. */
export const WINDOW_OPEN: readonly [number, number] = [0.012, 0.07];

/**
 * What the slab looks at while it is still narrow: the door just below the
 * glass, a touch closer than the film's own framing. It eases back to the
 * film's framing as it opens, which plays as a short dolly out.
 */
export const HERO_FOCUS = { x: 0.42, y: 0.69, zoom: 1.12 } as const;

/** The film (and the grey stage) fade back into the page over this range. */
export const FADE_OUT: readonly [number, number] = [0.9, 0.97];

/**
 * Chapter windows as [fade in from, fully in, start out, gone]. Each is fully
 * shown for its whole hold, arriving as the car settles into the shot and
 * leaving as it moves off.
 */
export const CHAPTERS = {
  flank: [0.165, 0.19, 0.28, 0.3],
  roast: [0.375, 0.4, 0.49, 0.51],
  delivery: [0.565, 0.59, 0.68, 0.7],
  takeoff: [0.775, 0.8, 0.9, 0.94],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type ChapterId = keyof typeof CHAPTERS;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Smoothstep easing, for the slab, the fades and the chapters. */
export const ease = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Gentler than smoothstep at the ends: it still arrives at rest, but keeps
 * most of a segment moving at an even pace, so the film does not feel slowed
 * down overall. Quadratic over the first and last 18%, linear between, with
 * matching slopes where they meet.
 */
export function easeInOut(t: number): number {
  const x = clamp01(t);
  const edge = 0.18;
  const k = 1 / (1 - edge);
  if (x < edge) return (k * x * x) / (2 * edge);
  if (x > 1 - edge) return 1 - (k * (1 - x) * (1 - x)) / (2 * edge);
  return k * (x - edge / 2);
}

/** The film position in beats for a progress value. Monotonic. */
export function beatAt(p: number, segments = SEGMENTS): number {
  const progress = clamp01(p);
  for (const segment of segments) {
    if (progress <= segment.to) {
      const [a, b] = segment.beats;
      if (a === b) return a;
      const span = segment.to - segment.from;
      // Eased inside a moving segment: the car settles into each hold and
      // pulls away from it, instead of stopping dead on one scroll pixel.
      const t = span > 0 ? (progress - segment.from) / span : 1;
      return a + (b - a) * easeInOut(t);
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.beats[1] : 0;
}

/** Fractional still index for a progress value, for a film of `count` stills. */
export function frameAt(p: number, count = LAST_BEAT + 1, segments = SEGMENTS): number {
  return (beatAt(p, segments) / LAST_BEAT) * (count - 1);
}

/** 0 to 1 visibility for a chapter window at progress p. */
export function chapterOpacity(p: number, [a, b, c, d]: readonly [number, number, number, number]): number {
  if (p <= a || p >= d) return 0;
  if (p < b) return ease((p - a) / (b - a));
  if (p <= c) return 1;
  return 1 - ease((p - c) / (d - c));
}

/**
 * Where the visitor is in the story, for CSS: `hero` before the slab starts
 * to open (the header hides its wordmark, the hero shows it), `film` while it
 * plays, `after` once it has faded into the page.
 */
export type FilmPhase = 'hero' | 'film' | 'after';

export function filmPhase(p: number): FilmPhase {
  if (p < WINDOW_OPEN[0]) return 'hero';
  if (p < FADE_OUT[1]) return 'film';
  return 'after';
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Two ways to put a 16:9 film on a screen.
 *
 * `cover` fills a landscape viewport and crops the excess, which loses a
 * little top and bottom on wide screens and a little side on 16:10.
 *
 * `band` is for portrait, where cover would crop three quarters of the width
 * and the car would spend most of the film off screen. The film sits in a
 * horizontal band instead, cropped to follow the car (the manifest's
 * per-frame focus), with copy above and below it.
 */
export type FitMode = 'cover' | 'band';

export function fitModeFor(width: number, height: number): FitMode {
  return width / height < 1.1 ? 'band' : 'cover';
}

/** The rectangle the film occupies once fully open, in CSS pixels. */
export function filmFrame(mode: FitMode, vw: number, vh: number): Rect {
  if (mode === 'cover') return { x: 0, y: 0, width: vw, height: vh };
  const height = Math.min(vh * 0.46, vw * 1.15);
  return { x: 0, y: (vh - height) * 0.47, width: vw, height };
}

/**
 * The slab before it opens: the middle of the blank space between the slogan
 * and the wordmark, the width of the content. `gap` is that space as
 * measured on the page (FilmStage reads it from the hero's layout); without
 * it, the fallback matches the server-rendered layout.
 */
export function closedSlab(vw: number, vh: number, gutter: number, gap?: { top: number; bottom: number }): Rect {
  const top = gap?.top ?? vh * 0.43;
  const bottom = gap?.bottom ?? vh * 0.6;
  const space = Math.max(24, bottom - top);
  const height = Math.max(18, space * 0.5);
  return { x: gutter, y: top + (space - height) / 2, width: Math.max(1, vw - gutter * 2), height };
}

/** 0 while the slab is closed, 1 once it is the full film rectangle. */
export function windowOpenness(p: number): number {
  return ease((p - WINDOW_OPEN[0]) / (WINDOW_OPEN[1] - WINDOW_OPEN[0]));
}

/** The slab at progress p, opening from `closed` to the full film rectangle. */
export function windowRect(p: number, mode: FitMode, vw: number, vh: number, closed = closedSlab(vw, vh, 0)): Rect {
  const full = filmFrame(mode, vw, vh);
  const t = windowOpenness(p);
  return {
    x: closed.x + (full.x - closed.x) * t,
    y: closed.y + (full.y - closed.y) * t,
    width: closed.width + (full.width - closed.width) * t,
    height: closed.height + (full.height - closed.height) * t,
  };
}

/**
 * How visible the black slab is: it fades in on its own after the hero's
 * entrance (`entrance`, 0 to 1, time based) or with the first scroll,
 * whichever comes first.
 */
export function slabAlpha(p: number, entrance: number): number {
  return Math.max(clamp01(entrance), ease((p - SLAB_IN[0]) / (SLAB_IN[1] - SLAB_IN[0])));
}

/** How far the film has risen out of the slab's black: 0 closed, 1 open. */
export function filmAlpha(p: number): number {
  return ease((windowOpenness(p) - 0.08) / 0.7);
}

/**
 * The slab pushes the type around it out of its way, in step with its
 * opening: by the time it is fully open the slogan has gone off the top of
 * the screen and the wordmark off the bottom, `margin` px clear, whether the
 * film opens to the whole screen (landscape) or to a band (portrait). The
 * slab's edges always stay ahead of the type, so it reads as pushed.
 * Transform only, so nothing reflows. `gap` is the blank band the slab
 * starts in (the slogan's bottom, the wordmark's top).
 */
export function heroPush(
  p: number,
  gap: { top: number; bottom: number },
  vh: number,
  margin = 24,
): { up: number; down: number } {
  const t = windowOpenness(p);
  return {
    up: -(gap.top + margin) * t,
    down: Math.max(0, vh - gap.bottom + margin) * t,
  };
}

/**
 * The grey stage: 0 is the page's own ground, 1 is the film and the page
 * toned to the studio grey. It comes in as the slab opens and goes out with
 * the smoke, so the page is its usual colour before and after the film.
 */
export function stageTone(p: number): number {
  const into = ease((windowOpenness(p) - 0.2) / 0.8);
  const out = ease((p - FADE_OUT[0]) / (FADE_OUT[1] - FADE_OUT[0]));
  return into * (1 - out);
}

type Placement = { dx: number; dy: number; dw: number; dh: number };

/**
 * While the slab is closed, frame the film on HERO_FOCUS (centred in the
 * slab, slightly zoomed); as it opens, ease to the film's own placement.
 */
export function heroFraming(p: number, win: Rect, at: Placement): Placement {
  const open = windowOpenness(p);
  if (open >= 1) return at;
  const dw = at.dw * HERO_FOCUS.zoom;
  const dh = at.dh * HERO_FOCUS.zoom;
  const closed: Placement = {
    dw,
    dh,
    dx: win.x + win.width / 2 - HERO_FOCUS.x * dw,
    dy: win.y + win.height / 2 - HERO_FOCUS.y * dh,
  };
  const mix = (a: number, b: number) => a + (b - a) * open;
  return { dx: mix(closed.dx, at.dx), dy: mix(closed.dy, at.dy), dw: mix(closed.dw, at.dw), dh: mix(closed.dh, at.dh) };
}

/**
 * Source and destination for drawing one film frame into the film rectangle.
 *
 * Cover crops symmetrically. Band scales the frame to the band's height and
 * slides the crop to keep `focus` (0 to 1 across the frame) centred, without
 * ever showing past the frame's own edges.
 */
export function placeFrame(
  mode: FitMode,
  frame: Rect,
  imageWidth: number,
  imageHeight: number,
  focus = 0.5,
): { dx: number; dy: number; dw: number; dh: number } {
  if (mode === 'cover') {
    const scale = Math.max(frame.width / imageWidth, frame.height / imageHeight);
    const dw = imageWidth * scale;
    const dh = imageHeight * scale;
    return { dx: frame.x + (frame.width - dw) / 2, dy: frame.y + (frame.height - dh) / 2, dw, dh };
  }
  const scale = frame.height / imageHeight;
  const dw = imageWidth * scale;
  const dh = frame.height;
  const ideal = frame.x + frame.width / 2 - focus * dw;
  const dx = Math.min(frame.x, Math.max(frame.x + frame.width - dw, ideal));
  return { dx, dy: frame.y, dw, dh };
}

/** Stills per beat: 1 for a 30 a second cut, 2 for 60. */
export function stillsPerBeat(count: number): number {
  return Math.max(1, Math.round(count / (LAST_BEAT + 1)));
}

/**
 * Loading order for the frames: the first, then a coarse pass across the
 * whole film, refined in halves. Scrubbing works from the first second on a
 * slow connection (at a lower frame rate) and sharpens as frames land.
 * `step` 2 skips odd frames entirely, for phones. The coarse stride scales
 * with the cut, so the first pass costs the same at any frame rate.
 */
export function loadOrder(count: number, step = 1): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i >= 0 && i < count && i % step === 0 && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  push(0);
  for (let stride = 16 * stillsPerBeat(count); stride >= step; stride /= 2) {
    for (let i = 0; i < count; i += stride) push(i);
  }
  push(count - 1 - ((count - 1) % step));
  return order;
}

/** Frames that must be in before the boot loader lets go: the coarse pass. */
export function bootSet(count: number, step = 1): number[] {
  const perBeat = stillsPerBeat(count);
  const coarse = Math.max(8 * perBeat, step);
  return loadOrder(count, step).filter((i) => i % coarse === 0 || i < 6 * step * perBeat);
}
