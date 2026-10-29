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
    <>
      <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="car-title">
        <Link href="/cars" className="keycap t-label">
          <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
          Back to the fleet
        </Link>

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-14 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <div className="car-tilt">
              <CarPhoto src={car.image_url} name={`${car.brand} ${car.model}, ${car.year}`} aspect="aspect-[3/2]" priority className="shadow-[var(--shadow-float)]" />
            </div>
            <PhotoCreditLine image={car.image_url} className="mt-8 max-w-[60ch]" />
          </div>

          <div className="relative lg:col-span-5">
            <p className="t-eyebrow text-[var(--muted)]">{car.brand}</p>
            <h1 id="car-title" className="t-mega mt-4 text-[clamp(3.25rem,8.4vw,9rem)]">
              {car.model}
            </h1>
            <p className="t-sub mt-10">
              {formatCurrency(rate)}
              <span className="t-body text-[var(--muted)]"> a day</span>
            </p>
            {car.description && <p className="t-body mt-6 max-w-[42ch]">{car.description}</p>}

            <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--ink)]/25 pt-8">
              <Spec label="Year" value={String(car.year)} />
              <Spec label="Seats" value={String(car.seats)} />
              <Spec label="Fuel" value={car.fuel_type} />
              <Spec label="Gearbox" value={car.transmission} />
              <Spec label="Lives in" value={branch} />
            </dl>

            <ButtonLink href={`/booking/${car.id}`} size="lg" className="mt-12 w-full">
              Reserve this car
            </ButtonLink>

            <Annotation
              tilt={-8}
              arrow="swoop"
              arrowClassName="ml-auto mr-16 h-auto w-20 -scale-x-100 rotate-[150deg] text-[var(--accent-text)] order-first"
              className="mt-4 hidden flex-col items-end text-right text-[var(--accent-text)] lg:flex"
            >
              {`delivery free inside ${DELIVERY_TIERS[0].maxKm} km`}
            </Annotation>
          </div>
        </div>
      </StackPanel>

      <StackPanel tone="hot" tilt={-1} className="panel" aria-labelledby="getting-it">
        <h2 id="getting-it" className="t-mega max-w-[14ch]">
          How it gets to you.
        </h2>
        <div className="mt-16 grid grid-cols-1 gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="t-eyebrow text-[var(--color-blush)]">Collect it</p>
            <p className="t-sub mt-4">{branch}</p>
            <p className="t-body mt-3">{car.branch_address}</p>
            <a href={phone.href} className="t-body mt-1 inline-block underline decoration-1 underline-offset-4">
              {phone.display}
            </a>
            <p className="t-body mt-6 text-[var(--color-blush)]">Free, any time the branch is open.</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="t-eyebrow text-[var(--color-blush)]">Or we bring it</p>
            <dl className="mt-6 flex flex-col">
              {DELIVERY_TIERS.map((tier, i) => (
                <div key={tier.maxKm} className="flex items-baseline justify-between gap-6 border-b border-[var(--color-blush)]/35 py-4">
                  <dt className="t-body">
                    {i === 0 ? 'Up to' : `${DELIVERY_TIERS[i - 1]!.maxKm} to`} {tier.maxKm} km from {branch}
                  </dt>
                  <dd className="t-sub">{tier.fee === 0 ? 'Free' : formatCurrency(tier.fee)}</dd>
                </div>
              ))}
            </dl>
            <p className="t-body mt-6 text-[var(--color-blush)]">Beyond {MAX_DELIVERY_KM} km we cannot deliver yet. The fee is in the total before you pay.</p>
            <ButtonLink href={`/booking/${car.id}`} variant="blush" size="lg" className="mt-10">
              Reserve this car
            </ButtonLink>
          </div>
        </div>
      </StackPanel>
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-label text-[var(--muted)]">{label}</dt>
      <dd className="mt-2 font-display text-xl font-light capitalize">{value}</dd>
    </div>
  );
}
