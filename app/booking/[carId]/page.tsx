import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCar } from '@/lib/services/cars';
import { getSession } from '@/lib/auth/guards';
import { CheckoutForm } from '@/components/sections/CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function BookingPage({
  params,
}: {
  params: Promise<{ carId: string }>;
}) {
  const session = await getSession();
  const { carId: raw } = await params;
  const carId = Number(raw);

  if (!Number.isInteger(carId) || carId <= 0) notFound();

  // Checked on the server. Hiding the form client-side would not stop a direct
  // POST, which is why the API re-checks too.
  if (!session) redirect(`/login?next=/booking/${carId}`);

  const car = await getCar(carId);
  if (!car) notFound();

  return (
    <main className="px-8 pt-24 pb-20 md:px-16 md:pb-32">
      <div className="mx-auto w-full max-w-[1600px]">
        <Link
          href={`/cars/${car.id}`}
          className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)] transition-colors duration-500 hover:text-[var(--color-carmine)]"
        >
          Back to the car
        </Link>

        <h1 className="font-display mt-8 text-4xl leading-[0.95] text-[var(--ink)] md:text-6xl">
          {car.brand}{' '}
          <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
            {car.model}
          </span>
        </h1>

        <div className="mt-16">
          <CheckoutForm
            carId={car.id}
            ratePerDay={Number(car.price_per_day)}
            branch={{
              name: car.branch_name,
              latitude: Number(car.branch_latitude),
              longitude: Number(car.branch_longitude),
            }}
          />
        </div>
      </div>
    </main>
  );
}
