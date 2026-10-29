/**
 * Landing film timings. Every number the scrubber depends on lives here or in
 * timeline.ts, not at a call site. See docs/VIDEO_STATE_MACHINE.md section 6.
 */

/** Floor, so a warm cache does not flash the wordmark and vanish. */
export const BOOT_MIN_MS = 900;

/**
 * Ceiling. Past this the loader lets go with whatever has arrived: the
 * scrubber draws the nearest loaded still, so a slow network gets a choppier
 * film, never a stuck screen.
 */
export const BOOT_MAX_MS = 6000;

/** Loader out. The colour-transition tier. */
export const LOADER_FADE_MS = 700;

/**
 * Track length lives in CSS (`--film-track` in globals.css: 700vh, 600vh on
 * portrait), so the server render already has the right height. The film's
 * 264 stills spread over about 540vh of that: roughly 18px of wheel per still
 * on a 900px screen, fine enough that slow scrolling never steps.
 */

/**
 * Smoothing on top of the scroll position. Takes the edge off keyboard jumps
 * (Page Down, Space) without adding perceptible lag to a wheel or a finger.
 */
export const PROGRESS_SPRING = { stiffness: 260, damping: 42, mass: 0.35, restDelta: 0.00005 } as const;

/** Session flag: the hero's entrance has played once this session. */
export const ENTRANCE_SEEN_KEY = 'd4drive:entrance-seen';

/**
 * The film as a video, for visitors who asked for reduced motion and then
 * choose to watch it anyway (FilmOnRequest). It opens past the fade up from
 * black: mean luma only crosses legibility at 1.2s.
 */
export const POSTER_TIME = 1.2;

export const VIDEO_SOURCES = {
  webm: '/videos/d4drive-1080.webm',
  mp4: '/videos/d4drive-1080.mp4',
  poster: '/posters/poster.webp',
} as const;
