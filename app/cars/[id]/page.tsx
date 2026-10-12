import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { Annotation } from '@/components/ui/Annotation';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CarPhoto } from '@/components/ui/CarPhoto';
import { PhotoCreditLine } from '@/components/ui/PhotoCreditLine';
import { DELIVERY_TIERS, MAX_DELIVERY_KM } from '@/lib/constants';
import { formatPhone } from '@/lib/services/branches';
import { getCar } from '@/lib/services/cars';
import { formatCurrency } from '@/lib/services/pricing';
import { parsePositiveId } from '@/lib/validation/id';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const carId = parsePositiveId((await params).id);
  if (carId === null) return { title: 'Car not found' };
  try {
    const car = await getCar(carId);
    return { title: car ? `${car.brand} ${car.model}` : 'Car not found' };
  } catch {
    return { title: 'The fleet' };
  }
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const carId = parsePositiveId(id);
  if (carId === null) notFound();

  let car;
  try {
    car = await getCar(carId);
  } catch (error) {
    console.error('[cars/detail/page]', error);
    return (
      <StackPanel tone="studio" className="panel min-h-[80dvh] pt-[calc(var(--header-h)+6rem)]">
        <h1 className="t-display">This car could not be loaded.</h1>
        <p className="t-body mt-6 max-w-[48ch] text-[var(--muted)]">The database did not respond. This is on our side, not yours.</p>
        <Link href="/cars" className="keycap t-label mt-10">
          Back to the fleet
        </Link>
      </StackPanel>
    );
  }
  if (!car) notFound();

  const rate = Number(car.price_per_day);
  const branch = car.branch_name.replace(/^D4Drive\s+/, '');
  const phone = formatPhone(car.branch_phone);

  return (
    <section data-tone="light" className="tone-studio panel pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="car-title">
      <Link href="/cars" className="keycap t-label">
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        Back to the fleet
      </Link>

      {/* The photo first, then everything about the car fitted beside it.
          The fleet's photo lands in data-car-hero (CarLink); the words
          arrive just after it (`.car-arrive`). */}
      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          {/* Level at rest, tilting toward the pointer only while it is on the photo. */}
          <div className="car-tilt" data-car-hero={car.id}>
            <CarPhoto src={car.image_url} name={`${car.brand} ${car.model}, ${car.year}`} aspect="aspect-[3/2]" priority />
          </div>
        </div>

        <div className="car-arrive lg:col-span-5">
          <p className="t-eyebrow text-[var(--muted)]">{car.brand}</p>
          <h1 id="car-title" className="t-display mt-3 text-[clamp(2.25rem,3.6vw,3.75rem)]">
            {car.model}
          </h1>
          <p className="mt-5 font-display text-[clamp(1.5rem,2vw,2rem)] font-light">
            {formatCurrency(rate)}
            <span className="t-body text-[var(--muted)]"> a day</span>
          </p>
          {car.description && <p className="t-body mt-4 max-w-[46ch]">{car.description}</p>}

          <dl className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4 border-t border-[var(--ink)]/25 pt-5">
            <Spec label="Year" value={String(car.year)} />
            <Spec label="Seats" value={String(car.seats)} />
            <Spec label="Fuel" value={car.fuel_type} />
            <Spec label="Gearbox" value={car.transmission} />
            <Spec label="Kept at" value={branch} />
          </dl>
          <PhotoCreditLine image={car.image_url} className="mt-6 max-w-[60ch]" />
        </div>
      </div>

      {/* How it reaches the customer, straight under the photo and the
          details, on the way down to the one Reserve button. */}
      <section aria-labelledby="getting-it" className="car-arrive mt-[clamp(2.5rem,4vw,3.5rem)] border-t border-[var(--ink)]/25 pt-[clamp(2rem,3.5vw,3rem)]">
        <h2 id="getting-it" className="t-sub max-w-[16ch]">
          How it gets to you.
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="t-eyebrow text-[var(--muted)]">Collect it</p>
            <p className="t-sub mt-4">{branch}</p>
            <p className="t-body mt-3">{car.branch_address}</p>
            <a href={phone.href} className="t-body mt-1 inline-block underline decoration-1 underline-offset-4 transition-colors hover:text-[var(--accent-text)]">
              {phone.display}
            </a>
            <p className="t-body mt-6 max-w-[40ch] text-[var(--muted)]">
              Free from {branch}. Any of our other branches within {MAX_DELIVERY_KM} km can hand it over too, for the same fee
              as a delivery that far.
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="t-eyebrow text-[var(--muted)]">Or we bring it</p>
            <dl className="mt-6 flex flex-col">
              {DELIVERY_TIERS.map((tier, i) => (
                <div key={tier.maxKm} className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)]/20 py-4">
                  <dt className="t-body">
                    {i === 0 ? 'Up to' : `${DELIVERY_TIERS[i - 1]!.maxKm} to`} {tier.maxKm} km from {branch}
                  </dt>
                  <dd className="t-sub">{tier.fee === 0 ? 'Free' : formatCurrency(tier.fee)}</dd>
                </div>
              ))}
            </dl>
            <p className="t-body mt-6 text-[var(--muted)]">
              Beyond {MAX_DELIVERY_KM} km we cannot deliver yet. Pick your address on the map at checkout and the fee is
              worked out before you pay.
            </p>
          </div>
        </div>

        <div className="relative mt-[clamp(3rem,6vw,5rem)] flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <ButtonLink href={`/booking/${car.id}`} size="lg" className="w-full sm:w-auto sm:min-w-[22rem]">
            Reserve this car
          </ButtonLink>
          <Annotation
            tilt={-8}
            arrow="long"
            arrowClassName="order-first h-auto w-[6.5rem] -scale-x-100 rotate-[8deg] text-[var(--accent-text)]"
            className="hidden items-center gap-3 text-[var(--accent-text)] md:flex"
          >
            {`free inside ${DELIVERY_TIERS[0].maxKm} km`}
          </Annotation>
        </div>
      </section>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-label text-[var(--muted)]">{label}</dt>
      <dd className="mt-1.5 font-display text-lg font-light capitalize">{value}</dd>
    </div>
  );
}
