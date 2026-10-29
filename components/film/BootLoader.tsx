'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Z } from '@/lib/constants';
import { LOADER_FADE_MS } from './constants';

interface BootLoaderProps {
  /** 0 to 1. The share of the film's first pass that has actually arrived. */
  progress: number;
  /** True once enough has arrived (or the ceiling passed). Fades the loader. */
  dismissed: boolean;
  onFaded: () => void;
}

/**
 * The first thing a visitor sees on the landing page.
 *
 * The rule is a `scaleX` transform driven by a Motion value, not React state:
 * frames land many times a second and routing each one through a render would
 * show up directly in INP. It reports real arrivals and never moves backward.
 */
export function BootLoader({ progress, dismissed, onFaded }: BootLoaderProps) {
  const raw = useMotionValue(0);
  const smoothed = useSpring(raw, { stiffness: 60, damping: 20, mass: 0.6 });
  const scaleX = useTransform(smoothed, (v) => Math.min(Math.max(v, 0), 1));

  const [announced, setAnnounced] = useState(0);
  const highWater = useRef(0);

  useEffect(() => {
    highWater.current = Math.max(highWater.current, dismissed ? 1 : progress);
    raw.set(highWater.current);
    const percent = Math.round(highWater.current * 100);
    setAnnounced((current) => (percent > current ? percent : current));
  }, [progress, dismissed, raw]);

  return (
    <motion.div
      aria-hidden={dismissed}
      initial={{ opacity: 1 }}
      animate={{ opacity: dismissed ? 0 : 1 }}
      transition={{ duration: LOADER_FADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={() => {
        if (dismissed) onFaded();
      }}
      data-boot-loader
      style={{ zIndex: Z.bootLoader }}
      className="fixed inset-0 overflow-hidden bg-[var(--ground)]"
    >
      <div className="absolute inset-x-[var(--gutter)] top-[28svh]">
        <p className="t-label text-[var(--muted)]">Loading the film</p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={announced}
          aria-label="Loading the D4Drive film"
          className="mt-5 h-px w-full max-w-[38rem] bg-[var(--ink)]/20"
        >
          <motion.div style={{ scaleX, transformOrigin: 'left' }} className="h-px w-full bg-[var(--color-carmine)]" />
        </div>
      </div>

      {/* Cropped by the bottom of the screen on purpose: only the top of
          the letters ever shows. */}
      <p
        aria-hidden="true"
        className="t-condensed absolute -bottom-[0.32em] left-[calc(var(--gutter)-0.04em)] text-[clamp(14rem,52vw,58rem)] text-[var(--ink)]"
      >
        D4Drive
      </p>
    </motion.div>
  );
}
