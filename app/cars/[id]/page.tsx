import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCar } from '@/lib/services/cars';
import { formatCurrency } from '@/lib/services/pricing';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carId = Number(id);

  if (!Number.isInteger(carId) || carId <= 0) notFound();

  let car;
  try {
    car = await getCar(carId);
  } catch (error) {
    console.error('[cars/detail/page]', error);
    return (
      <main className="px-8 pt-24 md:px-16">
        <div className="mx-auto w-full max-w-[1600px] border-t border-[var(--ink)] pt-12">
          <h1 className="font-display text-4xl text-[var(--ink)]">
            This car could not be loaded
          </h1>
          <p className="mt-4 max-w-[52ch] font-body text-[var(--muted)]">
            The database did not respond. This is on our side, not yours.
          </p>
          <Link
            href="/cars"
            className="mt-8 inline-block font-body text-xs uppercase tracking-[0.2em] text-[var(--color-carmine)] underline underline-offset-8"
          >
            Back to the fleet
          </Link>
        </div>
      </main>
    );
  }

  if (!car) notFound();

  const rate = Number(car.price_per_day);

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <Link
          href="/cars"
          className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)] transition-colors duration-500 hover:text-[var(--color-carmine)]"
        >
          Back to the fleet
        </Link>

        {/* 7/5 split rather than 50/50. Asymmetry is required by DESIGN.md
            section 5, and it gives the image the weight it deserves. */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              {car.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={car.image_url}
                  alt={`${car.brand} ${car.model}, ${car.year}`}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <h1 className="font-display text-4xl leading-[0.95] text-[var(--ink)] md:text-6xl">
              {car.brand}{' '}
              <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
                {car.model}
              </span>
            </h1>

            <p className="mt-8 font-body text-3xl text-[var(--ink)]">
              {formatCurrency(rate)}
              <span className="font-body text-sm text-[var(--muted)]"> per day</span>
            </p>

            {car.description && (
              <p className="mt-8 max-w-[46ch] font-body leading-relaxed text-[var(--muted)]">
                {car.description}
              </p>
            )}

            {/* Grouped into a definition list rather than a hairline-per-row
                spec table. DESIGN.md section 8 bans the latter. */}
            <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--ink)] pt-8">
              <Spec label="Year" value={String(car.year)} />
              <Spec label="Fuel" value={car.fuel_type} />
              <Spec label="Transmission" value={car.transmission} />
              <Spec label="Seats" value={`${car.seats}`} />
              <Spec label="Collect from" value={car.branch_name} />
            </dl>

            <div className="mt-12">
              <Link href={`/booking/${car.id}`}>
                <Button size="lg" className="w-full">
                  Reserve this car
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-2 font-body text-sm capitalize text-[var(--ink)]">{value}</dd>
    </div>
  );
}
