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

/** The hero wordmark's old entrance: each letter springs up, 90ms apart. */
const LETTER_SPRING = { type: 'spring', stiffness: 210, damping: 13, mass: 0.9 } as const;
const LETTER_STAGGER = 0.09;
const WORD = [...'D4Drive'];

/**
 * The first thing a visitor sees on the landing page: the wordmark, in the
 * very place the hero keeps it. Its grey letters spring up into place one by
 * one (the hero wordmark's old entrance); once the last has landed they fill
 * from grey to ink as the film arrives.
 *
 * The ink is a second copy of the letters inside a window that rises from
 * the bottom: the window moves up by what is still to load and the letters
 * inside it move down by the same amount, so they hold still while more of
 * them shows. Two transforms driven by a Motion value, not React state:
 * frames land many times a second and routing each one through a render
 * would show up directly in INP. It reports real arrivals and never moves
 * backward. Once the letters are full it fades, and the hero's own wordmark
 * is already underneath, letter for letter.
 */
export function BootLoader({ progress, dismissed, onFaded }: BootLoaderProps) {
  const raw = useMotionValue(0);
  const fill = useSpring(raw, { stiffness: 80, damping: 22, mass: 0.6, restDelta: 0.001 });
  const windowY = useTransform(fill, (v) => `${(1 - Math.min(Math.max(v, 0), 1)) * 100}%`);
  const lettersY = useTransform(fill, (v) => `${-(1 - Math.min(Math.max(v, 0), 1)) * 100}%`);

  const [announced, setAnnounced] = useState(0);
  const [full, setFull] = useState(false);
  // The fill waits for the letters: nothing pours into a letter still in flight.
  const [landed, setLanded] = useState(false);
  const highWater = useRef(0);

  // In case the last letter's animation never reports (a background tab).
  useEffect(() => {
    const id = window.setTimeout(() => setLanded(true), 2400);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    highWater.current = Math.max(highWater.current, dismissed ? 1 : progress);
    if (landed) raw.set(highWater.current);
    const percent = Math.round(highWater.current * 100);
    setAnnounced((current) => (percent > current ? percent : current));
  }, [progress, dismissed, landed, raw]);

  // Fade only once the ink has reached the top of the letters.
  useEffect(() => fill.on('change', (v) => v > 0.985 && setFull(true)), [fill]);
  const leaving = dismissed && full;

  return (
    <motion.div
      aria-hidden={leaving}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: LOADER_FADE_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={() => {
        if (leaving) onFaded();
      }}
      data-boot-loader
      style={{ zIndex: Z.bootLoader }}
      className="fixed inset-0 overflow-hidden bg-[var(--ground)]"
    >
      {/* The hero's own classes, so the letters sit exactly where the
          hero's wordmark is waiting underneath. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={announced}
        aria-label="Loading the D4Drive film"
        className="hero-base"
      >
        <div className="hero-wordmark relative">
          <p aria-hidden="true" className="t-condensed select-none whitespace-nowrap text-[var(--ink)]/15">
            {WORD.map((letter, i) => (
              <motion.span
                key={`${letter}-${i}`}
                data-loader-letter
                className="inline-block"
                initial={{ y: '115%' }}
                animate={{ y: '0%' }}
                transition={{ ...LETTER_SPRING, delay: i * LETTER_STAGGER }}
                onAnimationComplete={i === WORD.length - 1 ? () => setLanded(true) : undefined}
              >
                {letter}
              </motion.span>
            ))}
          </p>
          <motion.div aria-hidden="true" data-loader-ink style={{ y: windowY }} className="absolute inset-0 overflow-hidden">
            <motion.p style={{ y: lettersY }} className="t-condensed select-none whitespace-nowrap text-[var(--ink)]">
              {WORD.map((letter, i) => (
                <span key={`${letter}-${i}`} className="inline-block">
                  {letter}
                </span>
              ))}
            </motion.p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
