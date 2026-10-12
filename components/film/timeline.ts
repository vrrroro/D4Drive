/**
 * The landing film's timeline.
 *
 * Pure functions over plain numbers: scroll progress in, film frame and layer
 * geometry out. No DOM, no React, so the whole choreography is unit tested
 * (tests/film-timeline.test.ts) and FilmStage only has to draw what it is told.
 *
 * Progress `p` runs 0 to 1 across the pinned track. Film positions are given
 * in beats: the film's frames at 30 a second, 0 to 263, from 1.25s in.
 * `frameAt` scales beats to however many stills the manifest has (264 at 30
 * a second, 525 at 60), so the choreography does not change with the cut.
 * See docs/VIDEO_STATE_MACHINE.md for the contract.
 */

/** The film's last beat (its last frame at 30 a second). */
export const LAST_BEAT = 263;

/**
 * The cut: at the top of the page the space between the slogan and the
 * wordmark is plain grey. The first scroll slits it open across the whole
 * width, and the slit's two edges move apart, up and down, pushing the slogan
 * and the wordmark ahead of them, until the film fills its rectangle.
 */
export const CUT: readonly [number, number] = [0.003, 0.055];

/** How much closer the film sits inside the cut than its own framing, settling as it opens. */
export const CUT_ZOOM = 1.07;

/**
 * The film plays across this range of the track, starting from rest just
 * before the cut is fully open (so it eases into motion as the cut settles)
 * and coming to rest at the end. `RUN_EDGE` is the eased share at each end.
 */
export const FILM_RUN: readonly [number, number] = [0.045, 0.94];
export const RUN_EDGE = 0.06;

/**
 * The film slows down, never stops, while there is something to read. In
 * these beat ranges it plays at `SLOW` of its pace, easing down to it and
 * back up over `SLOW_RAMP` beats either side: the copy fades in while the
 * film decelerates and out while it picks up again. Each range is the shot
 * its copy is set against: side on (flank), head-on (roast), three-quarter
 * (delivery). The take-off plays at full pace into the end of the film.
 */
export const SLOWDOWNS = {
  flank: [58, 84],
  roast: [112, 132],
  delivery: [160, 190],
} as const satisfies Record<string, readonly [number, number]>;

export const SLOW = 0.35;
export const SLOW_RAMP = 10;

/** The take-off's copy fades in over these beats, as the smoke starts. */
export const TAKEOFF_BEATS: readonly [number, number] = [205, 222];

/** The film fades into the page (the same grey) over this range. */
export const FADE_OUT: readonly [number, number] = [0.88, 0.95];

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Smoothstep easing, for the cut, the fades and the chapters. */
export const ease = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Gentler than smoothstep at the ends: it still starts and stops at rest, but
 * keeps most of a segment moving at an even pace. Quadratic over the first
 * and last `edge` of it, linear between, with matching slopes where they meet.
 */
export function easeInOut(t: number, edge = 0.18): number {
  const x = clamp01(t);
  const k = 1 / (1 - edge);
  if (x < edge) return (k * x * x) / (2 * edge);
  if (x > 1 - edge) return 1 - (k * (1 - x) * (1 - x)) / (2 * edge);
  return k * (x - edge / 2);
}

/** 1 inside [lo, hi], easing to 0 over `ramp` either side. */
function plateau(b: number, lo: number, hi: number, ramp: number): number {
  if (b <= lo - ramp || b >= hi + ramp) return 0;
  if (b < lo) return ease((b - (lo - ramp)) / ramp);
  if (b <= hi) return 1;
  return 1 - ease((b - hi) / ramp);
}

/**
 * How much scroll a beat of film costs, relative to its normal pace: 1, rising
 * smoothly to 1 / SLOW while there is copy to read. The film's speed is its
 * inverse, so it eases down and up with no corner anywhere.
 */
export function scrollCost(beat: number): number {
  let extra = 0;
  for (const [lo, hi] of Object.values(SLOWDOWNS)) extra = Math.max(extra, plateau(beat, lo, hi, SLOW_RAMP));
  return 1 + (1 / SLOW - 1) * extra;
}

/** Cumulative scroll cost at every TABLE_STEP of a beat, for inverting. */
const TABLE_STEP = 1 / 8;
const COST: number[] = (() => {
  const table = [0];
  const steps = Math.round(LAST_BEAT / TABLE_STEP);
  for (let i = 1; i <= steps; i += 1) {
    const b = i * TABLE_STEP;
    table.push(table[i - 1]! + ((scrollCost(b - TABLE_STEP) + scrollCost(b)) / 2) * TABLE_STEP);
  }
  return table;
})();
const TOTAL_COST = COST[COST.length - 1]!;

/** The beat at which `cost` of the film's scroll has been spent. */
function beatForCost(cost: number): number {
  if (cost <= 0) return 0;
  if (cost >= TOTAL_COST) return LAST_BEAT;
  let lo = 0;
  let hi = COST.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (COST[mid]! <= cost) lo = mid;
    else hi = mid;
  }
  const span = COST[hi]! - COST[lo]!;
  return (lo + (span > 0 ? (cost - COST[lo]!) / span : 0)) * TABLE_STEP;
}

/**
 * The film position in beats for a progress value. Monotonic, and smooth: at
 * rest before the run, easing into its pace, slowing (never stopping) for
 * each SLOWDOWN, easing to rest on its last frame.
 */
export function beatAt(p: number): number {
  const t = (clamp01(p) - FILM_RUN[0]) / (FILM_RUN[1] - FILM_RUN[0]);
  if (t <= 0) return 0;
  if (t >= 1) return LAST_BEAT;
  return beatForCost(easeInOut(t, RUN_EDGE) * TOTAL_COST);
}

/** The progress value at which the film reaches `beat`: beatAt's inverse. */
export function progressAtBeat(beat: number): number {
  let lo = FILM_RUN[0];
  let hi = FILM_RUN[1];
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    if (beatAt(mid) < beat) lo = mid;
    else hi = mid;
  }
  return Number(((lo + hi) / 2).toFixed(5));
}

/** Fractional still index for a progress value, for a film of `count` stills. */
export function frameAt(p: number, count = LAST_BEAT + 1): number {
  return (beatAt(p) / LAST_BEAT) * (count - 1);
}

type Window = readonly [number, number, number, number];

const slowWindow = ([lo, hi]: readonly [number, number]): Window => [
  progressAtBeat(lo - SLOW_RAMP),
  progressAtBeat(lo),
  progressAtBeat(hi),
  progressAtBeat(hi + SLOW_RAMP),
];

/**
 * Chapter windows as [fade in from, fully in, start out, gone]. The three
 * reading chapters are exactly their slowdowns: in while the film slows, held
 * while it is slow, out while it picks up. The take-off comes in with the
 * smoke and stays until the film fades into the page.
 */
export const CHAPTERS = {
  flank: slowWindow(SLOWDOWNS.flank),
  roast: slowWindow(SLOWDOWNS.roast),
  delivery: slowWindow(SLOWDOWNS.delivery),
  takeoff: [progressAtBeat(TAKEOFF_BEATS[0]), progressAtBeat(TAKEOFF_BEATS[1]), FADE_OUT[0], 0.92],
} as const satisfies Record<string, Window>;

export type ChapterId = keyof typeof CHAPTERS;

/** 0 to 1 visibility for a chapter window at progress p. */
export function chapterOpacity(p: number, [a, b, c, d]: readonly [number, number, number, number]): number {
  if (p <= a || p >= d) return 0;
  if (p < b) return ease((p - a) / (b - a));
  if (p <= c) return 1;
  return 1 - ease((p - c) / (d - c));
}

/**
 * Where the visitor is in the story, for CSS: `hero` before the cut opens
 * (the hero's letters are hover targets), `film` while it plays, `after`
 * once it has faded into the page.
 */
export type FilmPhase = 'hero' | 'film' | 'after';

export function filmPhase(p: number): FilmPhase {
  if (p < CUT[0]) return 'hero';
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

/** The blank band between the slogan's bottom and the wordmark's top, in px. */
export interface Gap {
  top: number;
  bottom: number;
}

/** The fallback gap, matching the server-rendered layout until it is measured. */
export function defaultGap(vh: number): Gap {
  return { top: vh * 0.43, bottom: vh * 0.6 };
}

/** 0 at the top of the page, 1 once the cut has opened to the film's rectangle. */
export function cutAmount(p: number): number {
  return ease((p - CUT[0]) / (CUT[1] - CUT[0]));
}

/**
 * The cut's top and bottom edges, in px. It opens from a line across the
 * middle of the gap and its edges travel to the film rectangle's, so both
 * arrive together. `null` once it is fully open: draw unclipped.
 */
export interface Cut {
  top: number;
  bottom: number;
}

export function cutEdges(p: number, mode: FitMode, vw: number, vh: number, gap: Gap = defaultGap(vh)): Cut | null {
  const t = cutAmount(p);
  if (t >= 1) return null;
  const frame = filmFrame(mode, vw, vh);
  const mid = gap.top + Math.max(0, gap.bottom - gap.top) / 2;
  return {
    top: mid + (frame.y - mid) * t,
    bottom: mid + (frame.y + frame.height - mid) * t,
  };
}

/**
 * The cut pushes the type out of its way: the slogan rides up on its top
 * edge and the wordmark down on its bottom edge, `margin` px clear of it, so
 * they only move once the cut reaches them. By the time it is fully open
 * both are off the screen, also on portrait, where the film's band stops
 * short of the screen's edges (the `t ** 3` term carries them the rest of
 * the way). Transform only, so nothing reflows.
 */
export function heroPush(
  p: number,
  mode: FitMode,
  vw: number,
  vh: number,
  gap: Gap,
  margin = 14,
): { up: number; down: number } {
  const t = cutAmount(p);
  const frame = filmFrame(mode, vw, vh);
  const edges = cutEdges(p, mode, vw, vh, gap) ?? { top: frame.y, bottom: frame.y + frame.height };
  const clearTop = gap.top + margin;
  const clearBottom = Math.max(0, vh - gap.bottom + margin);
  return {
    up: Math.min(0, edges.top - margin - gap.top, -clearTop * t ** 3),
    down: Math.max(0, edges.bottom + margin - gap.bottom, clearBottom * t ** 3),
  };
}

type Placement = { dx: number; dy: number; dw: number; dh: number };

/**
 * Inside the cut the film sits a touch closer (CUT_ZOOM, about the cut's
 * centre) and settles to its own placement as it opens: a short, gentle
 * dolly out.
 */
export function cutFraming(p: number, at: Placement, centre: { x: number; y: number }): Placement {
  const t = cutAmount(p);
  if (t >= 1) return at;
  const zoom = CUT_ZOOM + (1 - CUT_ZOOM) * t;
  return {
    dw: at.dw * zoom,
    dh: at.dh * zoom,
    dx: centre.x + (at.dx - centre.x) * zoom,
    dy: centre.y + (at.dy - centre.y) * zoom,
  };
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
