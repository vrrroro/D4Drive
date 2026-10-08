/**
 * The landing film's timeline.
 *
 * Pure functions over plain numbers: scroll progress in, film frame and layer
 * geometry out. No DOM, no React, so the whole choreography is unit tested
 * (tests/film-timeline.test.ts) and FilmStage only has to draw what it is told.
 *
 * Progress `p` runs 0 to 1 across the pinned track. Frame numbers index
 * `FILM_MANIFEST` (264 stills, 30 per second of film, from 1.25s in).
 * See docs/VIDEO_STATE_MACHINE.md for the contract.
 */

/** Scroll-to-film mapping. Each segment holds one beat of the film. */
export const SEGMENTS: ReadonlyArray<{ from: number; to: number; frames: [number, number] }> = [
  // Close on the door; the window opens out to the full studio.
  { from: 0, to: 0.09, frames: [0, 24] },
  // The camera pulls back along the flank.
  { from: 0.09, to: 0.25, frames: [24, 80] },
  // The car turns to face you, head-on at frame 120.
  { from: 0.25, to: 0.45, frames: [80, 136] },
  // It keeps turning, front three-quarter, then the right flank.
  { from: 0.45, to: 0.66, frames: [136, 205] },
  // Burnout and take-off: the car leaves frame right through its own smoke.
  { from: 0.66, to: 0.9, frames: [205, 263] },
  // Smoke settles while it fades into the page.
  { from: 0.9, to: 1, frames: [263, 263] },
];

/** The hero window opens out to full bleed between these two points. */
export const WINDOW_OPEN: readonly [number, number] = [0.006, 0.085];

/**
 * What the closed window looks at: the door just below the glass, a touch
 * closer than the film's own framing, so the slab reads as red paint rather
 * than dark glass. It eases back to the film's framing as the window opens,
 * which plays as a short dolly out.
 */
export const HERO_FOCUS = { x: 0.42, y: 0.69, zoom: 1.12 } as const;

/** Smoke fades into the page ground over this range. */
export const FADE_OUT: readonly [number, number] = [0.9, 0.985];

/**
 * Chapter windows as [fade in from, fully in, start out, gone].
 * Each sits in the space the film leaves at that moment: the clear top band
 * once the camera has pulled back, the flanks while the car faces you, the
 * smoke once it has gone.
 */
export const CHAPTERS = {
  // The headline leaves before the window opens under it: type over a
  // half-open film reads as a mistake, not a transition.
  hero: [-1, 0, 0.004, 0.032],
  flank: [0.1, 0.135, 0.225, 0.255],
  roast: [0.275, 0.31, 0.43, 0.46],
  delivery: [0.475, 0.51, 0.63, 0.66],
  takeoff: [0.72, 0.76, 0.94, 0.985],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type ChapterId = keyof typeof CHAPTERS;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Smoothstep easing, for the window opening and the fade. */
export const ease = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Fractional frame for a progress value. Monotonic, clamped to the film. */
export function frameAt(p: number, segments = SEGMENTS): number {
  const progress = clamp01(p);
  for (const segment of segments) {
    if (progress <= segment.to) {
      const span = segment.to - segment.from;
      const t = span > 0 ? (progress - segment.from) / span : 1;
      const [a, b] = segment.frames;
      return a + (b - a) * clamp01(t);
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.frames[1] : 0;
}

/** 0 to 1 visibility for a chapter window at progress p. */
export function chapterOpacity(p: number, [a, b, c, d]: readonly [number, number, number, number]): number {
  if (p <= a || p >= d) return 0;
  if (p < b) return ease((p - a) / (b - a));
  if (p <= c) return 1;
  return 1 - ease((p - c) / (d - c));
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

/** 0 while the hero window is closed, 1 once it is full bleed. */
export function windowOpenness(p: number): number {
  return ease((p - WINDOW_OPEN[0]) / (WINDOW_OPEN[1] - WINDOW_OPEN[0]));
}

/**
 * The hero's window into the film: a slab the headline overlaps, opening out
 * to the full film rectangle as the visitor starts to scroll.
 */
export function windowRect(p: number, mode: FitMode, vw: number, vh: number): Rect {
  const full = filmFrame(mode, vw, vh);
  const closed: Rect =
    mode === 'cover'
      ? { x: vw * 0.07, y: vh * 0.335, width: vw * 0.6, height: vh * 0.235 }
      : { x: vw * 0.06, y: full.y + full.height * 0.18, width: vw * 0.88, height: full.height * 0.62 };
  const t = windowOpenness(p);
  return {
    x: closed.x + (full.x - closed.x) * t,
    y: closed.y + (full.y - closed.y) * t,
    width: closed.width + (full.width - closed.width) * t,
    height: closed.height + (full.height - closed.height) * t,
  };
}

type Placement = { dx: number; dy: number; dw: number; dh: number };

/**
 * While the window is closed, frame the film on HERO_FOCUS (centred in the
 * window, slightly zoomed); as it opens, ease to the film's own placement.
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

/**
 * Loading order for the frames: the first, then a coarse pass across the
 * whole film, refined in halves. Scrubbing works from the first second on a
 * slow connection (at a lower frame rate) and sharpens as frames land.
 * `step` 2 skips odd frames entirely, for phones.
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
  for (let stride = 16; stride >= step; stride /= 2) {
    for (let i = 0; i < count; i += stride) push(i);
  }
  push(count - 1 - ((count - 1) % step));
  return order;
}

/** Frames that must be in before the boot loader lets go: the coarse pass. */
export function bootSet(count: number, step = 1): number[] {
  const coarse = Math.max(8, step);
  return loadOrder(count, step).filter((i) => i % coarse === 0 || i < 6 * step);
}
