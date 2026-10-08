'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Z } from '@/lib/constants';
import { getLenis } from './SmoothScroll';

/**
 * Back to top, once the visitor is 300px down.
 *
 * Visibility comes from an IntersectionObserver on a sentinel 300px into the
 * document, not from reading the scroll position: no scroll listeners. When
 * hidden it is out of the tab order as well as out of sight.
 */
export function BackToTop() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function toTop() {
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
  }

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="pointer-events-none absolute left-0 top-[300px] h-px w-px" />
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top"
        tabIndex={shown ? 0 : -1}
        aria-hidden={!shown}
        style={{ zIndex: Z.floating }}
        className={`keycap fixed bottom-6 left-6 bg-[var(--ground)] text-[var(--color-carmine)] transition-opacity duration-700 md:bottom-8 md:left-8 ${
          shown ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <ArrowUp aria-hidden className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </>
  );
}
