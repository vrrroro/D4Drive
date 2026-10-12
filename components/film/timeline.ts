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
 * 30 a second, 524 at 60), so the choreography does not change with the cut.
 * See docs/VIDEO_STATE_MACHINE.md for the contract.
 */

/** The film's last beat (its last frame at 30 a second). */
export const LAST_BEAT = 263;

/**
 * Scroll-to-film mapping: one long run. The film never stops while the page
 * scrolls; the copy comes and goes over a moving picture. Only the very
 * start (the film appearing in the hero's gap) and the very end (once it has
 * faded into the page) are still. `edge` is the eased share at each end of a
 * moving segment (easeInOut).
 */
export const SEGMENTS: ReadonlyArray<{ from: number; to: number; beats: [number, number]; edge?: number }> = [
  // The film appears in the blank space between the slogan and the wordmark.
  { from: 0, to: 0.012, beats: [0, 0] },
  // It opens out to the whole screen and plays through to the smoke.
  { from: 0.012, to: 0.94, beats: [0, LAST_BEAT], edge: 0.08 },
  // Gone into the page.
  { from: 0.94, to: 1, beats: [LAST_BEAT, LAST_BEAT] },
];

/**
 * The film blooms out of the blank grey between the slogan and the wordmark
 * between these two points: nothing at the very top of the page, then a
 * soft-edged pool of picture that spreads until it fills the screen.
 */
export const BLOOM: readonly [number, number] = [0.004, 0.075];

/** Share of the bloom's radius that is solid picture; the rest feathers into the page. */
export const BLOOM_CORE = 0.45;

/** How much closer the film starts than its own framing, settling as it opens. */
export const BLOOM_ZOOM = 1.06;

/** The film fades into the page (the same grey) over this range. */
export const FADE_OUT: readonly [number, number] = [0.88, 0.95];

/**
 * Chapter windows as [fade in from, fully in, start out, gone], each centred
 * on the moment its shot passes: side on (beat 80), head-on (120),
 * three-quarter (176), and the take-off through the smoke.
 */
export const CHAPTERS = {
  flank: [0.235, 0.26, 0.335, 0.36],
  roast: [0.385, 0.41, 0.465, 0.49],
  delivery: [0.54, 0.565, 0.655, 0.68],
  takeoff: [0.76, 0.785, 0.88, 0.92],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type ChapterId = keyof typeof CHAPTERS;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Smoothstep easing, for the window, the fades and the chapters. */
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

/** The film position in beats for a progress value. Monotonic. */
export function beatAt(p: number, segments = SEGMENTS): number {
  const progress = clamp01(p);
  for (const segment of segments) {
    if (progress <= segment.to) {
      const [a, b] = segment.beats;
      if (a === b) return a;
      const span = segment.to - segment.from;
      // Eased at the two ends, so the film starts and stops smoothly rather
      // than on one scroll pixel; even pace everywhere between.
      const t = span > 0 ? (progress - segment.from) / span : 1;
      return a + (b - a) * easeInOut(t, segment.edge);
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
 * Where the visitor is in the story, for CSS: `hero` before the window starts
 * to open (the hero's letters are hover targets), `film` while it plays,
 * `after` once it has faded into the page.
 */
export type FilmPhase = 'hero' | 'film' | 'after';

export function filmPhase(p: number): FilmPhase {
  if (p < BLOOM[0]) return 'hero';
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

/** 0 at the top of the page, 1 once the film fills its rectangle. */
export function bloomAmount(p: number): number {
  return ease((p - BLOOM[0]) / (BLOOM[1] - BLOOM[0]));
}

/**
 * How visible the film is: nothing at the top of the page, so the space
 * between the slogan and the wordmark is plain grey; it comes up over the
 * first part of the bloom, so it appears out of the page rather than popping.
 */
export function bloomAlpha(p: number): number {
  return ease((p - BLOOM[0]) / ((BLOOM[1] - BLOOM[0]) * 0.55));
}

/**
 * The soft ellipse the film is seen through while it blooms: solid inside
 * BLOOM_CORE of its radii, feathering to nothing at the edge, so there is
 * never a hard edge or a rectangle. It starts small in the middle of the
 * gap and grows, its centre drifting to the film's, until its solid core
 * covers the whole film rectangle. `null` once it does: draw unmasked.
 */
export interface BloomShape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function bloomShape(p: number, mode: FitMode, vw: number, vh: number, gap: Gap = defaultGap(vh)): BloomShape | null {
  const t = bloomAmount(p);
  if (t >= 1) return null;
  const frame = filmFrame(mode, vw, vh);
  const space = Math.max(24, gap.bottom - gap.top);
  const start = { cx: vw / 2, cy: gap.top + space / 2, rx: vw * 0.24, ry: Math.max(30, space * 0.45) };
  // Radii whose solid core reaches the frame's corners: (1/sqrt2, 1/sqrt2)
  // of each half-size lies exactly on the core's ellipse.
  const end = {
    cx: frame.x + frame.width / 2,
    cy: frame.y + frame.height / 2,
    rx: (Math.SQRT2 * frame.width) / 2 / BLOOM_CORE,
    ry: (Math.SQRT2 * frame.height) / 2 / BLOOM_CORE,
  };
  // The radii grow slowly at first, so the film is seen gathering in the gap
  // before it spreads; the centre moves evenly.
  const grow = t ** 1.6;
  const mix = (a: number, b: number, k: number) => a + (b - a) * k;
  return {
    cx: mix(start.cx, end.cx, t),
    cy: mix(start.cy, end.cy, t),
    rx: mix(start.rx, end.rx, grow),
    ry: mix(start.ry, end.ry, grow),
  };
}

/**
 * The bloom pushes the type out of its way: by the time the film fills the
 * screen the slogan has gone off the top and the wordmark off the bottom,
 * `margin` px clear, whether the film opens to the whole screen (landscape)
 * or to a band (portrait). Transform only, so nothing reflows.
 */
export function heroPush(p: number, gap: Gap, vh: number, margin = 24): { up: number; down: number } {
  const t = bloomAmount(p);
  return {
    up: -(gap.top + margin) * t,
    down: Math.max(0, vh - gap.bottom + margin) * t,
  };
}

type Placement = { dx: number; dy: number; dw: number; dh: number };

/**
 * While it blooms the film sits a touch closer (BLOOM_ZOOM, about the
 * bloom's centre) and settles to its own placement as it opens: a short,
 * gentle dolly out.
 */
export function bloomFraming(p: number, at: Placement, centre: { x: number; y: number }): Placement {
  const t = bloomAmount(p);
  if (t >= 1) return at;
  const zoom = BLOOM_ZOOM + (1 - BLOOM_ZOOM) * t;
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
