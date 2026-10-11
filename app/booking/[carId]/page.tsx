import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { CheckoutForm } from '@/components/sections/CheckoutForm';
import { getSession } from '@/lib/auth/guards';
import { getCar } from '@/lib/services/cars';
import { listCollectionBranches } from '@/lib/services/branches';
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

  const [car, branches] = await Promise.all([getCar(carId), listCollectionBranches()]);
  if (!car) notFound();

  return (
    <StackPanel tone="studio" className="panel pb-[clamp(3rem,6vw,5rem)] pt-[calc(var(--header-h)+clamp(1.25rem,2.5vw,2.5rem))]" aria-labelledby="booking-title">
      <Link href={`/cars/${car.id}`} className="keycap t-label">
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
        Back to the car
      </Link>

      <h1 id="booking-title" className="t-display mt-5 text-[clamp(2rem,3.6vw,3.75rem)]">
        Reserve the <span className="italic-safe inline-block italic">{car.model}</span>.
      </h1>

      <div className="mt-[clamp(1.25rem,2.4vw,2rem)]">
        <CheckoutForm
          carId={car.id}
          ratePerDay={Number(car.price_per_day)}
          branch={{
            id: car.branch_id,
            name: car.branch_name,
            latitude: Number(car.branch_latitude),
            longitude: Number(car.branch_longitude),
          }}
          branches={branches}
        />
      </div>
    </StackPanel>
  );
}
