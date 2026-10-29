'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import { FILM_MANIFEST } from '@/lib/film-manifest';
import { useFilm } from './FilmContext';
import { CHAPTERS, chapterOpacity, type ChapterId } from './timeline';

interface FilmChapterProps {
  id: ChapterId;
  className?: string;
  children: ReactNode;
  /** Still frame shown in the reduced-motion and no-script document. */
  still?: { src: string; alt: string };
}

/**
 * One beat of the film's copy, placed in the space the film leaves.
 *
 * Opacity follows the scroll exactly; the drift is sprung, so copy that
 * arrives with a flick of the wheel keeps settling for a moment after the
 * wheel stops. That trailing settle is the system's heading lag.
 */
export function FilmChapter({ id, className = '', children, still }: FilmChapterProps) {
  const { progress, reduced } = useFilm();
  const range = CHAPTERS[id];

  const opacity = useTransform(progress, (p) => chapterOpacity(p, range));
  const drift = useTransform(progress, (p) => {
    const [a, b, c, d] = range;
    if (p < b) return 48 * (1 - Math.max(0, (p - a) / (b - a)));
    if (p > c) return -48 * Math.min(1, (p - c) / (d - c));
    return 0;
  });
  const y = useSpring(drift, { stiffness: 90, damping: 22, mass: 0.6 });

  return (
    <motion.div
      data-chapter={id}
      className={`film-chapter absolute inset-0 ${className}`}
      style={reduced ? undefined : { opacity, y }}
    >
      {still && (
        // Only the reduced-motion document shows these; lazy, so the
        // scrubbing layout never downloads them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still.src} alt={still.alt} loading="lazy" decoding="async" className="film-still" width={FILM_MANIFEST.width} height={FILM_MANIFEST.height} />
      )}
      {children}
    </motion.div>
  );
}
