'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';

let instance: Lenis | null = null;

function createLenis(): Lenis {
  return new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, anchors: true, autoRaf: true });
}

/** Set by popstate: back and forward keep the browser's restored position. */
let restoring = false;

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
      instance = createLenis();
    };
    const stop = () => {
      instance?.destroy();
      instance = null;
    };
    const onChange = () => (media.matches ? stop() : start());

    const onPopState = () => {
      restoring = true;
    };

    start();
    media.addEventListener('change', onChange);
    window.addEventListener('popstate', onPopState);
    return () => {
      media.removeEventListener('change', onChange);
      window.removeEventListener('popstate', onPopState);
      stop();
    };
  }, []);

  // A new page. Lenis still holds the old page's eased target, and if the
  // wheel was still coasting when the link was clicked it keeps writing it
  // on every frame, which dragged the new page down to its end (the fleet
  // link from the header, or a car from the grid, landing at the bottom).
  // Even a forced immediate scrollTo did not hold against the coast, so the
  // old instance is thrown away: jump to the top of the new page before it
  // paints, then start a fresh Lenis from there with nothing in flight.
  // Back and forward keep the position the browser restored, and a
  // #fragment is left to the anchor.
  const firstPath = useRef(true);
  useLayoutEffect(() => {
    // The first render is a page load: the browser's own restoration stands.
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const keep = restoring || window.location.hash !== '';
    restoring = false;
    const hadLenis = instance !== null;
    instance?.destroy();
    instance = null;
    if (!keep) window.scrollTo(0, 0);
    if (hadLenis) instance = createLenis();
  }, [pathname]);

  return null;
}
