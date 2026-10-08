'use client';

import { createContext, useContext } from 'react';
import { motionValue, type MotionValue } from 'motion/react';

interface FilmContextValue {
  /** 0 to 1 across the pinned track, lightly sprung. */
  progress: MotionValue<number>;
  /** The boot loader has let go: the hero's entrance may run. */
  ready: boolean;
  /** Reduced motion: no scrubbing, chapters render as a plain document. */
  reduced: boolean;
}

const fallback: FilmContextValue = { progress: motionValue(0), ready: true, reduced: true };

export const FilmContext = createContext<FilmContextValue>(fallback);

export function useFilm(): FilmContextValue {
  return useContext(FilmContext);
}

export { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';
