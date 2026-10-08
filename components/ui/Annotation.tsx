'use client';

import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { HandArrow, type ArrowShape } from './HandArrow';
import { usePrefersReducedMotion } from '@/components/motion/use-prefers-reduced-motion';

interface AnnotationProps {
  children: ReactNode;
  arrow?: ArrowShape;
  /** Classes for the arrow: size, position, and the rotate/flip that aims it. */
  arrowClassName?: string;
  className?: string;
  /** The note's own tilt, in degrees. The system keeps these near +/-23. */
  tilt?: number;
  /** Start the reveal. Undefined reveals when scrolled into view. */
  play?: boolean;
  delay?: number;
  style?: CSSProperties;
}

/**
 * A red-pen note in the margin, with an arrow at whatever it is about.
 *
 * The words are real text, readable by a screen reader in place; only the
 * arrow is decorative. Notes never carry information the page does not also
 * say plainly somewhere else.
 */
export function Annotation({
  children,
  arrow,
  arrowClassName = '',
  className = '',
  tilt = -8,
  play,
  delay = 0,
  style,
}: AnnotationProps) {
  const reduced = usePrefersReducedMotion();
  const shown = { opacity: 1 };
  const trigger =
    play === undefined
      ? { whileInView: shown, viewport: { once: true, amount: 0.6 } }
      : { animate: play ? shown : { opacity: 0 } };

  return (
    <div className={`pointer-events-none ${className}`} style={style} data-annotation>
      <motion.p
        className="t-marker relative whitespace-pre-line"
        style={{ rotate: `${tilt}deg` }}
        initial={reduced ? shown : { opacity: 0 }}
        transition={{ delay, duration: 0.5 }}
        {...trigger}
      >
        {children}
      </motion.p>
      {arrow && <HandArrow shape={arrow} play={play} delay={delay + 0.15} className={arrowClassName} />}
    </div>
  );
}
