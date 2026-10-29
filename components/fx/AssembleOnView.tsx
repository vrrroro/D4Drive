'use client';

import { useRef, type ReactNode } from 'react';
import { useParticleAssemble } from './use-particles';

/**
 * Wraps server-rendered content so it condenses out of sand on first view.
 *
 * The children stay Server Components; only this wrapper ships JavaScript.
 * `index` staggers siblings in a grid so a row does not land all at once.
 */
export function AssembleOnView({
  children,
  index = 0,
  className = '',
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useParticleAssemble(ref, {
    delay: (index % 3) * 0.12,
    // Slightly coarser than the stage default: three cards land at once, and
    // low-end mobile GPUs pay per point.
    density: 2.5,
    duration: 1.6,
    spread: 190,
    gravity: -0.22,
    swirl: 54,
    drift: 0.6,
    stagger: 0.74,
    sweep: 0.5,
    sweepAngle: -0.5,
    size: 1.1,
    fade: 0.8,
  });

  return (
    <div ref={ref} data-assemble="pending" className={className}>
      {children}
    </div>
  );
}
