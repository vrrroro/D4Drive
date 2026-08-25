import { Z } from '@/lib/constants';

/**
 * Editorial gridlines.
 *
 * These sit at real 12-column boundaries that page content aligns to. The
 * design skill bans hairline grids drawn purely to make a page feel designed,
 * and DESIGN.md section 7 keeps them only on that condition. If a future
 * layout stops aligning to them, they become decoration and should be cut.
 *
 * Hidden below 768px, where four vertical rules on a narrow viewport are
 * clutter rather than structure.
 */
export function Gridlines() {
  const positions = ['16.666%', '33.333%', '66.666%', '83.333%'];

  return (
    <div
      aria-hidden="true"
      style={{ zIndex: Z.gridlines }}
      className="pointer-events-none fixed inset-0 hidden md:block"
    >
      <div className="relative mx-auto h-full w-full max-w-[1600px]">
        {positions.map((left) => (
          <div
            key={left}
            style={{ left }}
            className="absolute top-0 h-full w-px bg-[var(--ink)]/20"
          />
        ))}
      </div>
    </div>
  );
}
