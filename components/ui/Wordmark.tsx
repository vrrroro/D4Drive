'use client';

import { motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';

/**
 * Hover transforms, one per letter. Neighbours lean opposite ways, so a
 * letter that widens over the next one reads as pushed, not stacked.
 */
const TRANSFORMS = [
  'scaleX(1.45) scaleY(1.04) rotate(-3deg) translateY(0.07em)',
  'scaleX(1.45) scaleY(1.04) rotate(2deg) translateY(0.1em)',
  'scaleX(1.45) scaleY(1.04) rotate(-1deg) translateY(0.085em)',
  'scaleX(1.45) scaleY(1.04) rotate(-2deg) translateY(0.08em)',
  'scaleX(1.45) scaleY(1.04) rotate(1deg) translateY(0.075em)',
  'scaleX(1.45) scaleY(1.04) rotate(-3deg) translateY(0.1em)',
  'scaleX(1.45) scaleY(1.04) rotate(2deg) translateY(0.09em)',
];

interface WordmarkProps {
  text: string;
  /** Fleet photographs, one per letter, cycling if there are fewer. */
  images: string[];
  className?: string;
  /** Run the staggered entrance. Undefined renders it in place. */
  play?: boolean;
  delay?: number;
}

/**
 * Poster-scale letters that turn into windows onto the fleet.
 *
 * Ink at rest. On hover a letter's fill goes clear, it stretches, tilts and
 * drops, and the car behind it shows through the glyph (background-clip:
 * text). Decorative: the brand name is the header's link text, so this is
 * hidden from assistive technology.
 *
 * The photographs are attached only once the page is idle: seven of them
 * would otherwise race the film for the first second of bandwidth.
 */
export function Wordmark({ text, images, className = '', play, delay = 0 }: WordmarkProps) {
  const reduced = usePrefersReducedMotion();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (images.length === 0) return undefined;
    const arm = () => setArmed(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(arm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(arm, 2500);
    return () => window.clearTimeout(id);
  }, [images.length]);

  const letters = [...text];
  const animated = play !== undefined && !reduced;

  return (
    <p aria-hidden="true" className={`t-condensed select-none whitespace-nowrap ${className}`}>
      {letters.map((letter, i) => (
        <motion.span
          key={`${letter}-${i}`}
          className="inline-block"
          initial={animated ? { y: '115%' } : false}
          animate={animated && play ? { y: '0%' } : undefined}
          transition={{ type: 'spring', stiffness: 210, damping: 13, mass: 0.9, delay: delay + i * 0.09 }}
        >
          <span
            className="wordmark-letter"
            style={
              {
                backgroundImage: armed && images.length ? `url(${images[i % images.length]})` : undefined,
                '--hover-transform': TRANSFORMS[i % TRANSFORMS.length],
              } as CSSProperties
            }
          >
            {letter}
          </span>
        </motion.span>
      ))}
    </p>
  );
}
