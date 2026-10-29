import Link from 'next/link';
import { notFound } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth/guards';
import { formatCurrency } from '@/lib/services/pricing';
import { Button } from '@/components/ui/Button';
import type { RowDataPacket } from 'mysql2/promise';

export const dynamic = 'force-dynamic';

interface Row extends RowDataPacket {
  id: number;
  reference: string;
  start_date: Date;
  end_date: Date;
  days: number;
  total_amount: string;
  brand: string;
  model: string;
  delivery_mode: string;
}

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const session = await getSession();
  if (!session) notFound();

  const { reference } = await params;

  // Scoped to the owner in the query. A reference is guessable enough that
  // fetching it unscoped would leak other people's bookings.
  const booking = await queryOne<Row>(
    `SELECT bo.id, bo.reference, bo.start_date, bo.end_date, bo.days,
            bo.total_amount, c.brand, c.model, d.mode AS delivery_mode
       FROM bookings bo
       JOIN cars c ON c.id = bo.car_id
       JOIN deliveries d ON d.booking_id = bo.id
      WHERE bo.reference = ? AND bo.user_id = ?`,
    [reference, session.userId],
  );

  if (!booking) notFound();

  return (
    <main className="flex min-h-[100dvh] items-center px-8 py-24 md:px-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-6 md:col-start-2">
            <div className="h-px w-8 bg-[var(--color-carmine)] md:w-12" />

            <h1 className="font-display mt-8 text-5xl leading-[0.9] text-[var(--ink)] md:text-7xl">
              You are{' '}
              <span className="italic-safe inline-block font-display italic text-[var(--color-carmine)]">
                booked
              </span>
            </h1>

            <p className="mt-8 font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
              Reference
            </p>
            <p className="font-display mt-2 text-3xl text-[var(--ink)]">{booking.reference}</p>

            <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--ink)] pt-8">
              <div>
                <dt className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Car</dt>
                <dd className="mt-2 font-body text-sm text-[var(--ink)]">{booking.brand} {booking.model}</dd>
              </div>
              <div>
                <dt className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Total paid</dt>
                <dd className="mt-2 font-body text-sm text-[var(--ink)]">{formatCurrency(Number(booking.total_amount))}</dd>
              </div>
              <div>
                <dt className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Pickup</dt>
                <dd className="mt-2 font-body text-sm text-[var(--ink)]">{formatDate(booking.start_date)}</dd>
              </div>
              <div>
                <dt className="font-body text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">Return</dt>
                <dd className="mt-2 font-body text-sm text-[var(--ink)]">{formatDate(booking.end_date)}</dd>
              </div>
            </dl>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <a href={`/api/bookings/${booking.id}/invoice`}>
                <Button size="lg">Download invoice</Button>
              </a>
              <Link href="/bookings">
                <Button variant="secondary" size="lg">My bookings</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
