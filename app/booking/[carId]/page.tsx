import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { CheckoutForm } from '@/components/sections/CheckoutForm';
import { getSession } from '@/lib/auth/guards';
import { getCar } from '@/lib/services/cars';
import { parsePositiveId } from '@/lib/validation/id';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Reserve' };

export default async function BookingPage({ params }: { params: Promise<{ carId: string }> }) {
  const session = await getSession();
  const { carId: raw } = await params;
  const carId = parsePositiveId(raw);
  if (carId === null) notFound();

  // Checked on the server. Hiding the form client-side would not stop a
  // direct POST, which is why the API re-checks too.
  if (!session) redirect(`/login?next=/booking/${carId}`);

  const car = await getCar(carId);
  if (!car) notFound();

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="booking-title">
      <Link href={`/cars/${car.id}`} className="keycap t-label">
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        Back to the car
      </Link>

      <h1 id="booking-title" className="t-mega mt-12 max-w-[16ch] text-[clamp(3rem,8vw,8.5rem)]">
        Reserve the <span className="italic-safe inline-block italic">{car.model}</span>.
      </h1>

      <div className="mt-[clamp(3rem,6vw,6rem)]">
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
    </StackPanel>
  );
}
