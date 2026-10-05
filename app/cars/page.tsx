import Link from 'next/link';
import { listCars, listBrands } from '@/lib/services/cars';
import { carFilterSchema } from '@/lib/validation/schemas';
import { formatCurrency } from '@/lib/services/pricing';
import { CarFilters } from '@/components/sections/CarFilters';
import { AssembleOnView } from '@/components/fx/AssembleOnView';
import { Card } from '@/components/ui/Card';
import { CarPhoto } from '@/components/ui/CarPhoto';

export const dynamic = 'force-dynamic';

/**
 * Catalog.
 *
 * Filter state lives in the URL rather than component state, so a filtered
 * view is linkable, survives a refresh, and works with browser back. That also
 * keeps this a Server Component: the filtering happens in SQL, not in the
 * browser, and the page ships no JavaScript for it.
 */
export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;

  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value !== '') flat[key] = value;
  }

  const parsed = carFilterSchema.safeParse(flat);
  // An unparseable query string falls back to defaults rather than erroring.
  // Someone hand-editing a URL should get the catalog, not a stack trace.
  const filters = parsed.success ? parsed.data : carFilterSchema.parse({});

  let result;
  let failed = false;
  let brands: string[] = [];

  try {
    [result, brands] = await Promise.all([listCars(filters), listBrands()]);
  } catch (error) {
    console.error('[cars/page]', error);
    failed = true;
  }

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <header className="md:col-span-7 md:col-start-2">
            <div className="h-px w-8 bg-[var(--ink)] md:w-12" />
            <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-7xl">
              The{' '}
              <span className="italic-safe inline-block font-display italic text-[var(--accent-text)]">
                fleet
              </span>
            </h1>
          </header>
        </div>

        {failed ? (
          <section className="mt-20 border-t border-[var(--ink)] pt-12">
            <h2 className="font-display text-3xl text-[var(--ink)]">
              The fleet could not be loaded
            </h2>
            <p className="mt-4 max-w-[52ch] font-body text-[var(--muted)]">
              The database did not respond. This is on our side, not yours.
            </p>
            <Link
              href="/cars"
              className="mt-8 inline-block font-body text-xs uppercase tracking-[0.2em] text-[var(--accent-text)] underline underline-offset-8"
            >
              Try again
            </Link>
          </section>
        ) : (
          <>
            <CarFilters brands={brands} current={filters} />

            {result && result.cars.length === 0 ? (
              <section className="mt-16 border-t border-[var(--ink)] pt-12">
                <h2 className="font-display text-3xl text-[var(--ink)]">
                  Nothing matches those filters
                </h2>
                <p className="mt-4 max-w-[52ch] font-body text-[var(--muted)]">
                  Widening the price range or clearing the fuel type usually
                  brings results back.
                </p>
                <Link
                  href="/cars"
                  className="mt-8 inline-block font-body text-xs uppercase tracking-[0.2em] text-[var(--accent-text)] underline underline-offset-8"
                >
                  Clear all filters
                </Link>
              </section>
            ) : (
              <section className="mt-16 grid grid-cols-1 gap-x-12 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
                {result?.cars.map((car, index) => (
                  <AssembleOnView key={car.id} index={index}>
                    <Card href={`/cars/${car.id}`} padding="flush">
                      <CarPhoto
                        src={car.image_url}
                        name={`${car.brand} ${car.model}`}
                        hoverReveal
                        decorative
                        priority={index === 0}
                      />

                      <h2 className="font-display mt-6 text-2xl leading-tight text-[var(--ink)] transition-colors duration-500 group-hover:text-[var(--accent-text)]">
                        {car.brand} {car.model}
                      </h2>

                      <p className="mt-2 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
                        {car.fuel_type} / {car.transmission} / {car.seats} seats
                      </p>

                      <p className="mt-4 font-body text-sm text-[var(--ink)]">
                        {formatCurrency(Number(car.price_per_day))}
                        <span className="text-[var(--muted)]"> per day</span>
                      </p>
                    </Card>
                  </AssembleOnView>
                ))}
              </section>
            )}

            {result && result.totalPages > 1 && (
              <nav
                aria-label="Catalog pages"
                className="mt-24 flex items-center justify-between border-t border-[var(--ink)]/20 pt-8"
              >
                <PageLink
                  filters={flat}
                  page={filters.page - 1}
                  disabled={filters.page <= 1}
                  label="Previous"
                />
                <p className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
                  Page {result.page} of {result.totalPages}
                </p>
                <PageLink
                  filters={flat}
                  page={filters.page + 1}
                  disabled={filters.page >= result.totalPages}
                  label="Next"
                />
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function PageLink({
  filters,
  page,
  disabled,
  label,
}: {
  filters: Record<string, string>;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="font-body text-xs uppercase tracking-[0.2em] text-[var(--muted)] opacity-40">
        {label}
      </span>
    );
  }

  const params = new URLSearchParams(filters);
  params.set('page', String(page));

  return (
    <Link
      href={`/cars?${params.toString()}`}
      className="font-body text-xs uppercase tracking-[0.2em] text-[var(--ink)] transition-colors duration-500 hover:text-[var(--accent-text)]"
    >
      {label}
    </Link>
  );
}
