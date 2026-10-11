'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};

interface CarLinkProps {
  href: string;
  carId: number;
  className?: string;
  children: ReactNode;
}

/**
 * A link to a car that carries its photograph across.
 *
 * Where the browser has View Transitions, the click is taken over: the
 * clicked card's photo (`[data-car-photo]`) and the car page's photo
 * (`[data-car-hero]`) share one transition name, so the browser morphs one
 * into the other while the rest of the page cross-fades (globals.css,
 * `::view-transition-*`). The new page is ready once its photo is in the
 * document, or after 2.5s regardless.
 *
 * Reduced motion, a modified click (new tab, new window) or a browser
 * without View Transitions gets the ordinary link, untouched.
 */
export function CarLink({ href, carId, className = '', children }: CarLinkProps) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const doc = document as ViewTransitionDocument;
    if (reduced || typeof doc.startViewTransition !== 'function') return;

    event.preventDefault();
    const photo = event.currentTarget.querySelector<HTMLElement>('[data-car-photo]');
    if (photo) photo.style.setProperty('view-transition-name', 'car-photo');
    document.documentElement.dataset.vt = 'car';

    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          router.push(href);
          const started = performance.now();
          // Polls the DOM, not React state, for the new page's photo.
          const check = () => {
            if (document.querySelector(`[data-car-hero="${carId}"]`) || performance.now() - started > 2500) resolve();
            else requestAnimationFrame(check);
          };
          requestAnimationFrame(check);
        }),
    );
    void transition.finished.finally(() => {
      delete document.documentElement.dataset.vt;
      photo?.style.removeProperty('view-transition-name');
    });
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
