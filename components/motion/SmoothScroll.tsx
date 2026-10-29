'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

let instance: Lenis | null = null;

/** The live Lenis instance, or null under reduced motion. */
export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Smooth, inertial wheel scrolling for the whole site.
 *
 * Lenis eases the native scroll position toward the wheel's target, so
 * everything scroll-linked (the film, the stacked panels, Motion's useScroll)
 * reads one smooth value instead of 100px jumps. It drives the real scroll
 * position, so sticky positioning, anchors, find-in-page and keyboard
 * scrolling all keep working. Touch scrolling stays native: phones already
 * have momentum, and fighting it feels wrong.
 *
 * Off entirely under reduced motion, and switched off live if the visitor
 * changes that preference.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const start = () => {
      if (instance || media.matches) return;
      instance = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, anchors: true, autoRaf: true });
    };
    const stop = () => {
      instance?.destroy();
      instance = null;
    };
    const onChange = () => (media.matches ? stop() : start());

    start();
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
      stop();
    };
  }, []);

  // A new page has a new height, and Next has already moved the scroll
  // position. Re-measure so the eased target matches where the page is.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      instance?.resize();
      if (instance) instance.scrollTo(window.scrollY, { immediate: true, force: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
