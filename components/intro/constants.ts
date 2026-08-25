/**
 * Intro sequence timings.
 *
 * Every value the sequence depends on lives here. Nothing is inlined at a call
 * site, so tuning the feel of the entry does not mean hunting through five
 * components. See docs/VIDEO_STATE_MACHINE.md section 9.
 */

/** Floor, so a warm cache does not flash the wordmark and vanish. */
export const BOOT_MIN_MS = 900;

/** Ceiling. Past this we stop waiting and take the recovered path. */
export const BOOT_MAX_MS = 6000;

/** Enough head start to play through on a typical connection. */
export const BUFFER_THRESHOLD = 0.25;

/** Loader out. Matches the colour-transition tier. */
export const LOADER_FADE_MS = 700;

/** Auth panel in and out. The UI interaction tier. */
export const GATE_FADE_MS = 500;

/** Video into landing content. The cinematic tier. */
export const REVEAL_MS = 1500;

/**
 * Seek target for the revealed frame.
 *
 * Measured, not guessed. This film fades up from black over roughly 1.2
 * seconds: mean luma is 8 at t=0.37, 30 at t=0.8, and only crosses legibility
 * at t=1.2. ffmpeg's blackdetect clears at 0.373, but that frame is still
 * visually black, and fading an alabaster loader onto it reads as a bug.
 *
 * Starting here also skips dead time. The fade-in carries no information, and
 * the remaining 8.9 seconds are the whole car.
 */
export const POSTER_TIME = 1.2;

/** No progress event for this long means the network has given up. */
export const STALL_TIMEOUT_MS = 4000;

/** Session flag key. sessionStorage, not localStorage: see section 6. */
export const INTRO_SEEN_KEY = 'd4drive:intro-seen';

export const VIDEO_SOURCES = {
  webm1080: '/videos/d4drive-1080.webm',
  mp41080: '/videos/d4drive-1080.mp4',
  webm720: '/videos/d4drive-720.webm',
  mp4720: '/videos/d4drive-720.mp4',
  poster: '/posters/poster.webp',
} as const;
