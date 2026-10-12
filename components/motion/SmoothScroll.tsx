'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';

let instance: Lenis | null = null;

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
      instance = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, anchors: true, autoRaf: true });
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
  // wheel was still coasting when the link was clicked it keeps easing toward
  // it, which dragged the new page down to its end (the fleet link landing on
  // the footer). Jump it, without easing, to the top of the new page before
  // it paints. Back and forward keep the position the browser restored, and a
  // #fragment is left to the anchor.
  const firstPath = useRef(true);
  useLayoutEffect(() => {
    // The first render is a page load: the browser's own restoration stands.
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const lenis = instance;
    const keep = restoring || window.location.hash !== '';
    restoring = false;
    if (!keep) window.scrollTo(0, 0);
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(keep ? window.scrollY : 0, { immediate: true, force: true });
    }
  }, [pathname]);

  return null;
}
