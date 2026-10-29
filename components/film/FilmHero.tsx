'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { EasterEgg } from '@/components/ui/EasterEgg';
import { Wordmark } from '@/components/ui/Wordmark';
import { useFilm } from './FilmContext';

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
 * The landing's opening frame: the slogan at the top, the whole wordmark at
 * the bottom, and a blank band between them.
 *
 * A black slab fades in out of that band (drawn by FilmStage), and as the
 * visitor scrolls it opens to the whole screen with the film rising out of
 * it. Its edges push the type out of the way: the slogan up, the wordmark
 * and the red dot down (`--hero-up`, `--hero-down`, written by FilmStage),
 * transform only.
 */
export function FilmHero({ images }: { images: string[] }) {
  const { ready, reduced } = useFilm();

  return (
    <div data-chapter="hero" className="film-chapter film-hero absolute inset-0">
      <div className="hero-slogan" data-hero-slogan>
        <h1 className="hero-lines t-hero">
          <Line from="near" delay={0} className="hero-line-1 text-[var(--ink)]">
            Drive easy.
          </Line>
          <Line from="left" delay={0.35} className="hero-line-2 italic text-[var(--accent-text)]">
            Book smart.
          </Line>
          <Line from="right" delay={0.65} className="hero-line-3 text-[var(--ink)]">
            Delivered to you.
          </Line>
        </h1>
      </div>

      <div className="hero-base">
        <motion.div
          className="hero-egg"
          data-film-decor
          initial={reduced ? false : { scale: 0 }}
          animate={ready ? { scale: 1 } : undefined}
          transition={{ delay: 1.7, duration: 0.8, ease: EXPO }}
        >
          <EasterEgg />
        </motion.div>
        <div className="hero-wordmark" data-hero-wordmark>
          <Wordmark text="D4Drive" images={images} play={ready} delay={0.8} className="pointer-events-auto text-[var(--ink)]" />
        </div>
      </div>
    </div>
  );
}
