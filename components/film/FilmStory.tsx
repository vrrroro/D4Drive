'use client';

import { animate, useMotionValue, useScroll, useSpring } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BootLoader } from './BootLoader';
import { FilmContext, usePrefersReducedMotion } from './FilmContext';
import { FilmStage } from './FilmStage';
import { BOOT_MAX_MS, BOOT_MIN_MS, ENTRANCE_SEEN_KEY, PROGRESS_SPRING, SLAB_ENTRANCE } from './constants';
import { filmPhase } from './timeline';

/**
 * The landing film: a tall track with the film pinned inside it.
 *
 * Scrolling the track scrubs the film (FilmStage) and moves the chapters
 * through the spaces the film leaves (FilmChapter). Nothing plays on its own:
 * the visitor's scroll is the playhead, forward and back.
 *
 * Reduced motion skips the canvas and the loader entirely; CSS turns the
 * track into a plain document of chapters, each with a still.
 */
export function FilmStory({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const toneRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  // The black slab's own fade-in, once the hero has arrived (time, not scroll).
  const entrance = useMotionValue(0);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, PROGRESS_SPRING);

  const [bootFraction, setBootFraction] = useState(0);
  const [booted, setBooted] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const firstVisit = useRef(true);

  useEffect(() => {
    try {
      firstVisit.current = sessionStorage.getItem(ENTRANCE_SEEN_KEY) !== '1';
    } catch {
      // Private mode can throw. Treat it as a first visit.
    }
  }, []);

  const bootStarted = useRef(false);
  const release = useCallback(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    // Both limits count from navigation start: the visitor began waiting
    // when they arrived, not when React mounted.
    const floor = firstVisit.current ? BOOT_MIN_MS : 0;
    window.setTimeout(() => setBooted(true), Math.max(0, floor - performance.now()));
  }, []);

  const handleBoot = useCallback(
    (fraction: number) => {
      setBootFraction(fraction);
      if (fraction >= 1) release();
    },
    [release],
  );

  // Ceiling: let go with whatever has arrived.
  useEffect(() => {
    if (reduced || booted) return undefined;
    const timer = window.setTimeout(release, Math.max(0, BOOT_MAX_MS - performance.now()));
    return () => window.clearTimeout(timer);
  }, [reduced, booted, release]);

  useEffect(() => {
    if (!loaderGone) return;
    try {
      sessionStorage.setItem(ENTRANCE_SEEN_KEY, '1');
    } catch {
      // Nothing to do; the entrance simply plays again next time.
    }
  }, [loaderGone]);

  // The phase, written straight onto the track for CSS (the header logo and
  // the grey stage hang off it). A motion-value subscription, not React state
  // and not a scroll listener.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduced) return undefined;
    const write = (p: number) => {
      const phase = filmPhase(p);
      if (track.dataset.filmPhase !== phase) track.dataset.filmPhase = phase;
    };
    write(progress.get());
    return progress.on('change', write);
  }, [progress, reduced]);

  const ready = reduced || loaderGone;

  useEffect(() => {
    if (!ready || reduced) return undefined;
    const controls = animate(entrance, 1, SLAB_ENTRANCE);
    return () => controls.stop();
  }, [ready, reduced, entrance]);
  const value = useMemo(() => ({ progress, ready, reduced }), [progress, ready, reduced]);

  return (
    <FilmContext.Provider value={value}>
      <section
        ref={trackRef}
        aria-label={label}
        data-tone="light"
        data-film-ready={ready ? 'true' : 'false'}
        data-film-phase="hero"
        className="film-track"
      >
        <div ref={stageRef} className="film-stage">
          {!reduced && (
            <FilmStage progress={progress} entrance={entrance} stageRef={stageRef} toneRef={toneRef} onBootProgress={handleBoot} />
          )}
          {/* The grey stage: the studio grey, multiplied over the film and the
              page while it plays. Its opacity is written by FilmStage. */}
          <div ref={toneRef} aria-hidden="true" className="film-tone" />
          <div className="film-layer">{children}</div>
        </div>
      </section>

      {!reduced && !loaderGone && (
        <BootLoader progress={bootFraction} dismissed={booted} onFaded={() => setLoaderGone(true)} />
      )}
    </FilmContext.Provider>
  );
}
