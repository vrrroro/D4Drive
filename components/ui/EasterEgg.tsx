'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { FILM_MANIFEST } from '@/lib/film-manifest';

/** Each click swaps the badge and the button's cursor. The last one revs. */
const STEPS: ReadonlyArray<{ badge: string; cursor: CSSProperties['cursor'] }> = [
  { badge: "What's that? • What's that? • ", cursor: 'pointer' },
  { badge: 'Stop clicking it! • Stop clicking it! • ', cursor: 'not-allowed' },
  { badge: 'Stop! Really, please • Really • ', cursor: 'grab' },
  { badge: 'We warned you! • We warned you! • ', cursor: 'grabbing' },
  { badge: 'Last chance! • Last chance! • ', cursor: 'pointer' },
  { badge: 'Happy now? • Happy now? • ', cursor: 'pointer' },
];

const FADE_MS = 500;

/**
 * The red dot. A hidden toy, escalating with every click, ending on the
 * film's own engine note (the burnout, cut from its soundtrack).
 *
 * Sound only ever starts from a click, and the next click stops it. Nothing
 * here autoplays, and nothing here carries information.
 */
export function EasterEgg({ className = '' }: { className?: string }) {
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number | null>(null);
  const pathId = useId();

  useEffect(
    () => () => {
      if (fade.current) window.clearInterval(fade.current);
      audio.current?.pause();
    },
    [],
  );

  function ramp(to: number, then?: () => void) {
    const el = audio.current;
    if (!el) return;
    if (fade.current) window.clearInterval(fade.current);
    const from = el.volume;
    let i = 0;
    const steps = 25;
    fade.current = window.setInterval(() => {
      i += 1;
      el.volume = Math.min(1, Math.max(0, from + ((to - from) * i) / steps));
      if (i >= steps) {
        if (fade.current) window.clearInterval(fade.current);
        fade.current = null;
        then?.();
      }
    }, FADE_MS / steps);
  }

  function click() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    // Final state: the dot is a play and stop toggle for the engine.
    if (!audio.current) {
      audio.current = new Audio(FILM_MANIFEST.audio);
      audio.current.addEventListener('ended', () => setPlaying(false));
    }
    const el = audio.current;
    if (playing) {
      ramp(0, () => el.pause());
      setPlaying(false);
    } else {
      el.currentTime = 0;
      el.volume = 0;
      void el.play().then(
        () => {
          setPlaying(true);
          ramp(0.9);
        },
        () => setPlaying(false),
      );
    }
  }

  const current = step >= 0 ? STEPS[step] : null;

  return (
    <div className={`pointer-events-auto relative h-20 w-20 ${className}`} data-easter-egg>
      <AnimatePresence initial={false} mode="popLayout">
        {current && (
          <motion.svg
            key={step}
            viewBox="0 0 80 80"
            aria-hidden="true"
            className="animate-spin-slow absolute inset-0 h-20 w-20 text-[var(--ink)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <defs>
              <path id={`${pathId}-${step}`} d="M40 40 m -31 0 a 31 31 0 1 1 62 0 a 31 31 0 1 1 -62 0" />
            </defs>
            <text className="fill-current font-body text-[7.6px] font-semibold uppercase tracking-[0.12em]">
              <textPath href={`#${pathId}-${step}`}>{current.badge}</textPath>
            </text>
          </motion.svg>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={click}
        aria-label={current ? current.badge.split(' •')[0] ?? 'Red dot' : 'A small red dot'}
        aria-pressed={step === STEPS.length - 1 ? playing : undefined}
        style={{ cursor: current?.cursor ?? 'help' }}
        className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      >
        <motion.svg
          viewBox="0 0 40 40"
          aria-hidden="true"
          initial={false}
          animate={{ scale: current ? 1 : 0.2 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="h-10 w-10 text-[var(--color-carmine)]"
        >
          <circle cx="20" cy="20" r="20" fill="currentColor" />
          {playing && <rect x="15" y="15" width="10" height="10" fill="var(--color-paper)" />}
        </motion.svg>
      </motion.button>
    </div>
  );
}
