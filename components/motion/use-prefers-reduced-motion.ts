'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * The visitor's motion preference, live, and safe to render with.
 *
 * Motion's own useReducedMotion reads the media query during the first client
 * render, so its answer can differ from the server's and React throws away
 * the hydrated tree. This answers `false` while hydrating (matching the
 * server) and the real preference straight after. CSS covers the frame in
 * between: every reduced-motion fallback is also a media query in
 * globals.css, so nothing moves before this catches up.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
