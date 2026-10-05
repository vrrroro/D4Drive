import { Z } from '@/lib/constants';

/**
 * Editorial gridlines.
 *
 * DESIGN.md section 7 keeps these only if they land on real 12-column
 * boundaries that content aligns to. So they are not positioned by
 * percentage: they are drawn by the same grid the pages use (the same
 * padding, `max-w-[1600px]`, 12 columns, `gap-x-12`), as the edges of three
 * four-column spans. That puts them at column 1 start, column 5 start,
 * column 9 start, and column 12 end at every width, which is where the
 * catalog's three-up cards, the admin tiles, and the detail page's text
 * column (`col-start-9`) sit.
 *
 * Shown from 1024px, where those three-up grids exist. Below that the pages
 * reflow to one or two columns and the lines would be decoration.
 */
export function Gridlines() {
  return (
    <div
      aria-hidden="true"
      style={{ zIndex: Z.gridlines }}
      className="pointer-events-none fixed inset-0 hidden px-16 lg:block"
    >
      <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-12 gap-x-12">
        <div className="col-span-4 border-l border-[var(--ink)]/20" />
        <div className="col-span-4 border-l border-[var(--ink)]/20" />
        <div className="col-span-4 border-x border-[var(--ink)]/20" />
      </div>
    </div>
  );
}
