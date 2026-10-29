'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Keeps the fixed header legible over whatever panel is under it.
 *
 * Every panel declares `data-tone` (light, hot, dark). An IntersectionObserver
 * watches a thin band where the header sits, and the last panel in document
 * order inside that band wins: stacked panels slide over earlier ones, so the
 * later one is the one on top. The header's colours follow in 300ms. This is
 * the reference system's logo chameleon, done with colour tokens instead of
 * CSS filters on an image.
 */
export function HeaderTone({ targetId }: { targetId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.getElementById(targetId);
    if (!header) return undefined;
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-tone]')).filter((el) => el !== header);
    const inBand = new Set<HTMLElement>();

    const apply = () => {
      let tone = 'light';
      for (const el of panels) if (inBand.has(el)) tone = el.dataset.tone ?? tone;
      header.dataset.tone = tone;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) inBand.add(el);
          else inBand.delete(el);
        }
        apply();
      },
      { rootMargin: '-3% 0px -96% 0px' },
    );
    panels.forEach((el) => observer.observe(el));

    // Scrolled at all? The sentinel 24px into the document says, without a
    // scroll listener. The frosted bar in globals.css hangs off this.
    const sentinel = document.querySelector('[data-scroll-sentinel]');
    const scrolled = new IntersectionObserver(([entry]) => {
      if (entry) header.dataset.scrolled = entry.isIntersecting ? 'false' : 'true';
    });
    if (sentinel) scrolled.observe(sentinel);

    return () => {
      observer.disconnect();
      scrolled.disconnect();
    };
  }, [targetId, pathname]);

  return null;
}
