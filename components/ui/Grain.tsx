import { Z } from '@/lib/constants';

/**
 * Paper grain.
 *
 * `fixed`, not absolute, and never on a scrolling container. Applying a noise
 * filter to something that scrolls forces continuous GPU repaints and destroys
 * frame rate on mid-range mobile hardware. That is the single most common way
 * this effect ships broken.
 *
 * It is also a Server Component. There is no state and no interactivity here,
 * so it costs zero client JavaScript.
 */
export function Grain() {
  return (
    <div
      aria-hidden="true"
      style={{ zIndex: Z.grain }}
      className="pointer-events-none fixed inset-0 opacity-[0.02] mix-blend-multiply"
    >
      <svg className="h-full w-full">
        <filter id="paper-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={4}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
    </div>
  );
}
