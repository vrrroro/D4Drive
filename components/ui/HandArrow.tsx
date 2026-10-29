'use client';

import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';

/**
 * A red-pen arrow that draws itself once.
 *
 * Three hand-drawn strokes, each with its head as a second stroke that lands
 * after the shaft. One shape points anywhere: rotate and flip it with the
 * `className` transform, the way the reference system flips a single arrow
 * clip with CSS rather than shipping eight assets.
 *
 * Drawing animates the stroke dash on a small SVG: paint only, no layout,
 * and nothing on the page moves because of it. Reduced motion draws it whole.
 */

const SHAPES = {
  swoop: {
    shaft: 'M9 22 C 46 2, 104 4, 140 40 C 162 62, 172 84, 170 108',
    head: 'M152 94 L 170 109 L 182 88',
    box: '0 0 200 120',
  },
  loop: {
    shaft: 'M8 70 C 26 18, 80 10, 94 42 C 104 68, 72 80, 66 58 C 60 32, 116 16, 182 38',
    head: 'M164 25 L 183 38 L 166 54',
    box: '0 0 200 100',
  },
  long: {
    shaft: 'M6 46 C 50 30, 98 58, 146 44 C 166 38, 180 36, 192 40',
    head: 'M175 27 L 193 40 L 176 54',
    box: '0 0 200 80',
  },
} as const;

export type ArrowShape = keyof typeof SHAPES;

interface HandArrowProps {
  shape?: ArrowShape;
  className?: string;
  /** Start drawing. Undefined draws when scrolled into view. */
  play?: boolean;
  delay?: number;
}

export function HandArrow({ shape = 'swoop', className = '', play, delay = 0 }: HandArrowProps) {
  const s = SHAPES[shape];
  const reduced = usePrefersReducedMotion();
  const drawn = { pathLength: 1, opacity: 1 };
  const hidden = reduced ? drawn : { pathLength: 0, opacity: 0 };
  const trigger = play === undefined ? { whileInView: drawn, viewport: { once: true, amount: 0.6 } } : { animate: play ? drawn : hidden };

  return (
    <svg viewBox={s.box} aria-hidden="true" className={`pointer-events-none overflow-visible ${className}`} fill="none">
      <motion.path
        d={s.shaft}
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={hidden}
        transition={{ pathLength: { delay, duration: 0.9, ease: [0.65, 0, 0.35, 1] }, opacity: { delay, duration: 0.01 } }}
        {...trigger}
      />
      <motion.path
        d={s.head}
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={hidden}
        transition={{ pathLength: { delay: delay + 0.8, duration: 0.28, ease: 'easeOut' }, opacity: { delay: delay + 0.8, duration: 0.01 } }}
        {...trigger}
      />
    </svg>
  );
}
