/**
 * Timings for the opening film.
 *
 * The two cut points below were measured off the source files rather than
 * eyeballed — see the notes on each. Change the video, re-measure these.
 */

export const LOGO = {
  src: "/media/logo-spin.mp4",
  poster: "/media/logo-poster.jpg",
  /** Full length of the clip, seconds. */
  duration: 6.04,
  /**
   * Where a loop cycle hands over. The clip is a half-rotation with a dolly-in,
   * so no frame pair in it matches (best RMSE ≈ 40/255) — there is no clean cut
   * point and looping has to be a cross-dissolve, not a splice.
   */
  loopAt: 4.0,
  /** Length of that dissolve, seconds. Long enough to read as a camera move. */
  crossfade: 0.7,
  /** Never release the loader before this much spin has been seen. */
  minSpin: 3.0,
  /** Where the deceleration starts — the mark settles facing camera by 5.7s. */
  settleFrom: 4.85,
  /** playbackRate at the bottom of the ramp. */
  settleRate: 0.42,
} as const;

export const CAR = {
  src: "/media/car-reveal.mp4",
  poster: "/media/car-headon.jpg",
  duration: 10.06,
  /**
   * The head-on frame, where the film stops for the login.
   * Found by minimising left/right mirror error across 4.9s–5.7s:
   * error bottoms out at 15.4 here versus ~49 at either end of that window.
   */
  headOn: 5.267,
  /** By here the car has left frame and only the skid marks remain. */
  skidClear: 9.62,
} as const;

/** Set once the opening film has played, so a reload does not replay it. */
export const INTRO_SEEN_KEY = "d4drive.intro-seen";
