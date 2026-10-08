'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import { Annotation } from '@/components/ui/Annotation';
import { EasterEgg } from '@/components/ui/EasterEgg';
import { Wordmark } from '@/components/ui/Wordmark';
import { useFilm } from './FilmContext';
import { CHAPTERS, chapterOpacity } from './timeline';

const EXPO = [0.16, 1, 0.3, 1] as const;

function Line({
  children,
  className,
  from,
  delay,
}: {
  children: ReactNode;
  className: string;
  from: 'left' | 'right' | 'near';
  delay: number;
}) {
  const { ready, reduced } = useFilm();
  const x = from === 'left' ? '-42vw' : from === 'right' ? '42vw' : -60;
  return (
    <motion.span
      className={`hero-line block ${className}`}
      initial={reduced ? false : { opacity: 0, x }}
      animate={ready ? { opacity: 1, x: 0 } : undefined}
      transition={{ delay, duration: from === 'near' ? 0.6 : 0.95, ease: EXPO }}
    >
      {children}
    </motion.span>
  );
}

/**
 * The landing's opening frame: the tagline overlapping a slab-shaped window
 * into the film, the brand cropped by the bottom of the screen, and two notes
 * in red pen. As the visitor scrolls, the window opens to full bleed (drawn by
 * FilmStage) and this layer drifts away.
 */
export function FilmHero({ images }: { images: string[] }) {
  const { progress, ready, reduced } = useFilm();
  const opacity = useTransform(progress, (p) => chapterOpacity(p, CHAPTERS.hero));
  const rise = useSpring(
    useTransform(progress, (p) => -Math.min(1, p / CHAPTERS.hero[3]) * 120),
    { stiffness: 90, damping: 22, mass: 0.6 },
  );
  const sink = useTransform(progress, (p) => Math.min(1, p / CHAPTERS.hero[3]) * 160);
  const interactive = useTransform(opacity, (o) => (o > 0.6 ? 'auto' : 'none'));

  return (
    <motion.div
      data-chapter="hero"
      className="film-chapter film-hero absolute inset-0"
      style={reduced ? undefined : { opacity, pointerEvents: interactive }}
    >
      <motion.h1 className="hero-lines t-hero" style={reduced ? undefined : { y: rise }}>
        <Line from="near" delay={0} className="hero-line-1 text-[var(--ink)]">
          Drive easy.
        </Line>
        <Line from="left" delay={0.35} className="hero-line-2 italic text-[var(--color-paper)]">
          Book smart.
        </Line>
        <Line from="right" delay={0.65} className="hero-line-3 text-[var(--ink)]">
          Delivered to you.
        </Line>
      </motion.h1>

      <motion.div className="hero-wordmark" style={reduced ? undefined : { y: sink }}>
        <Wordmark text="D4Drive" images={images} play={ready} delay={0.8} className="pointer-events-auto text-[var(--ink)]" />
      </motion.div>

      <div className="hero-note-left" data-film-decor>
        <Annotation
          play={ready}
          delay={2.2}
          tilt={-14}
          arrow="long"
          arrowClassName="ml-24 mt-2 h-auto w-[clamp(7rem,17vw,20rem)] rotate-[10deg] text-[var(--accent-text)]"
          className="text-[var(--accent-text)]"
        >
          {'self-drive\ncars'}
        </Annotation>
        <motion.div
          className="hero-egg"
          initial={reduced ? false : { scale: 0 }}
          animate={ready ? { scale: 1 } : undefined}
          transition={{ delay: 1.7, duration: 0.8, ease: EXPO }}
        >
          <EasterEgg />
        </motion.div>
      </div>

      <div className="hero-note-right" data-film-decor>
        <Annotation
          play={ready}
          delay={2.5}
          tilt={10}
          arrow="loop"
          arrowClassName="mt-2 h-auto w-[clamp(5rem,8vw,9rem)] -scale-x-100 rotate-[28deg] text-[var(--accent-text)]"
          className="text-right text-[var(--accent-text)]"
        >
          {"this one isn't\nfor rent. sadly."}
        </Annotation>
      </div>
    </motion.div>
  );
}
