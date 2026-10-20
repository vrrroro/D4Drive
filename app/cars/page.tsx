import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { LocationsSection } from '@/components/ui/LocationsSection';
import { getSession } from '@/lib/auth/guards';
import { CarFilters } from '@/components/sections/CarFilters';
import { FleetIndex } from '@/components/sections/FleetIndex';
import { Annotation } from '@/components/ui/Annotation';
import { getFleetSummary } from '@/lib/services/branches';
import { listBrands, listCars, type CarListResult } from '@/lib/services/cars';
import { formatCurrency } from '@/lib/services/pricing';
import { carFilterSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'The fleet' };

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const inWords = (n: number) => NUMBER_WORDS[n] ?? String(n);

/**
 * The catalog.
 *
 * The page grey from the heading to the last car: the filters, then the
 * grid of cars (FleetIndex). Signed-out visitors get the landing's
 * ending after it: the sign-in panel and the branches. Signed-in visitors
 * already have both, so the page simply ends.
 *
 * Filter state lives in the URL, so a filtered view is linkable, survives a
 * refresh, and works with the back button; the filtering happens in SQL.
 */
export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const session = await getSession();
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value !== '') flat[key] = value;
  }
  // An unparseable query string falls back to defaults rather than erroring.
  const parsed = carFilterSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : carFilterSchema.parse({});

  let result: CarListResult | null = null;
  let brands: string[] = [];
  let summary: Awaited<ReturnType<typeof getFleetSummary>> | null = null;
  let failed = false;
  try {
    [result, brands, summary] = await Promise.all([listCars(filters), listBrands(), getFleetSummary()]);
  } catch (error) {
    console.error('[cars/page]', error);
    failed = true;
  }

  return (
    <>
      <section data-tone="light" className="tone-studio panel pt-[calc(var(--header-h)+clamp(2rem,4.5vw,4.5rem))]" aria-labelledby="fleet-title">
        <div className="relative">
          <h1 id="fleet-title" className="t-mega">
            Pick a car.
          </h1>
          {summary && summary.cars > 0 && (
            <p className="t-body mt-10 max-w-[44ch] text-[var(--muted)]">
              {inWords(summary.cars).replace(/^\w/, (c) => c.toUpperCase())} cars across Bengaluru
              {summary.minRate !== null && <>, from {formatCurrency(summary.minRate)} a day</>}. Every one of them can come to your
              door, or wait for you at any of our {inWords(summary.branches)} branches.
            </p>
          )}
          <Annotation
            tilt={8}
            arrow="loop"
            arrowClassName="mt-1 h-auto w-32 rotate-[64deg] text-[var(--accent-text)]"
            className="absolute right-0 top-2 hidden w-56 text-[var(--accent-text)] lg:block"
          >
            {'all of them\ncome to you'}
          </Annotation>
        </div>

        {!failed && (
          <div className="mt-[clamp(3.5rem,7vw,6rem)]">
            <CarFilters brands={brands} current={filters} />
          </div>
        )}

        <div className="mt-[clamp(3rem,6vw,5rem)]">
          {failed ? (
            <div>
              <h2 className="t-display">The fleet could not be loaded.</h2>
              <p className="t-body mt-6 max-w-[48ch] text-[var(--muted)]">The database did not respond. This is on our side, not yours.</p>
              <Link href="/cars" className="keycap t-label mt-10">
                Try again
              </Link>
            </div>
          ) : result && result.cars.length === 0 ? (
            <div>
              <h2 className="t-display">Nothing matches those filters.</h2>
              <p className="t-body mt-6 max-w-[48ch] text-[var(--muted)]">Clearing the fuel type or the seat count usually brings cars back.</p>
              <Link href="/cars" className="keycap t-label mt-10">
                Clear all filters
              </Link>
            </div>
          ) : (
            <>
              <FleetIndex
                cars={(result?.cars ?? []).map((car) => ({
                  id: car.id,
                  brand: car.brand,
                  model: car.model,
                  pricePerDay: car.price_per_day,
                  seats: car.seats,
                  fuel: car.fuel_type,
                  transmission: car.transmission,
                  branch: car.branch_name.replace(/^D4Drive\s+/, ''),
                  image: car.image_url,
                }))}
              />
              {result && result.totalPages > 1 && (
                <nav aria-label="Catalog pages" className="mt-24 flex items-center justify-between border-t border-[var(--ink)]/20 pt-8">
                  <PageLink filters={flat} page={filters.page - 1} disabled={filters.page <= 1} label="Previous" />
                  <p className="t-label text-[var(--muted)]">
                    Page {result.page} of {result.totalPages}
                  </p>
                  <PageLink filters={flat} page={filters.page + 1} disabled={filters.page >= result.totalPages} label="Next" />
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      {!session && (
        <>
          <AuthPanel id="sign-in" tone="light" next="/cars" />
          <LocationsSection showFleetLink={false} />
        </>
      )}
    </>
  );
}

function PageLink({ filters, page, disabled, label }: { filters: Record<string, string>; page: number; disabled: boolean; label: string }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="keycap t-label opacity-40">
        {label}
      </span>
    );
  }
  const params = new URLSearchParams(filters);
  params.set('page', String(page));
  return (
    <Link href={`/cars?${params.toString()}`} className="keycap t-label">
      {label}
    </Link>
  );
}
