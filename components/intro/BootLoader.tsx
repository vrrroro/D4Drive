'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Z } from '@/lib/constants';
import { LOADER_FADE_MS } from './constants';

interface BootLoaderProps {
  /** 0 to 1. Real buffered fraction, not a timer. */
  progress: number;
  /** True once the machine has left BOOT. Triggers the fade out. */
  dismissed: boolean;
  onFaded: () => void;
}

/**
 * The first thing any visitor sees.
 *
 * The progress rule is a `scaleX` transform on a left-origin element, driven by
 * a Motion value rather than React state. `progress` events fire many times a
 * second during buffering, and routing each one through `useState` would
 * re-render the tree on every tick and show up directly in INP.
 */
export function BootLoader({ progress, dismissed, onFaded }: BootLoaderProps) {
  const raw = useMotionValue(0);

  // Eases toward the target so a burst of buffering does not jolt the bar.
  const smoothed = useSpring(raw, { stiffness: 60, damping: 20, mass: 0.6 });
  const scaleX = useTransform(smoothed, (v) => Math.min(Math.max(v, 0), 1));

  // Mirrored into state only for the ARIA value, which needs a real number in
  // the DOM. Rounded to whole percent so it updates rarely.
  const [announced, setAnnounced] = useState(0);
  const highWater = useRef(0);

  useEffect(() => {
    // The bar never moves backward. A `buffered` range can shrink when the
    // browser evicts data, and a reversing progress bar reads as a bug.
    highWater.current = Math.max(highWater.current, progress);
    raw.set(highWater.current);

    const percent = Math.round(highWater.current * 100);
    setAnnounced((current) => (percent > current ? percent : current));
  }, [progress, raw]);

  return (
    <motion.div
      aria-hidden={dismissed}
      initial={{ opacity: 1 }}
      animate={{ opacity: dismissed ? 0 : 1 }}
      transition={{ duration: LOADER_FADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={() => {
        if (dismissed) onFaded();
      }}
      style={{ zIndex: Z.bootLoader }}
      className="fixed inset-0 flex flex-col justify-end bg-[var(--ground)] px-8 pb-16 md:px-16 md:pb-24"
    >
      <div className="mx-auto w-full max-w-[1600px]">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-[var(--muted)]">
          Loading
        </p>

        <h1 className="font-display mt-4 text-6xl leading-[0.9] text-[var(--ink)] md:text-8xl">
          D4Drive
        </h1>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={announced}
          aria-label="Loading the D4Drive film"
          className="mt-10 h-px w-full bg-[var(--ink)]/20"
        >
          <motion.div
            style={{ scaleX, transformOrigin: 'left' }}
            className="h-px w-full bg-[var(--color-carmine)]"
          />
        </div>
      </div>
    </motion.div>
  );
}
