import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { getSession } from '@/lib/auth/guards';
import { listAllBookings } from '@/lib/services/bookings';
import { AdminBookingRow } from '@/components/sections/AdminBookingRow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Bookings admin' };

const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

export default async function AdminBookingsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/bookings');
  if (session.role !== 'admin') redirect('/');

  const bookings = await listAllBookings();

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="bookings-admin-title">
        <Link href="/admin" className="keycap t-label">
          <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.5} />
          Operations
        </Link>

        <h1 id="bookings-admin-title" className="t-mega mt-12 max-w-[14ch]">
          Bookings and <span className="italic-safe inline-block italic">deliveries</span>.
        </h1>

        {bookings.length === 0 ? (
          <section className="mt-16 max-w-[52ch]">
            <h2 className="t-sub">No bookings yet.</h2>
            <p className="t-body mt-4 text-[var(--muted)]">
              Bookings appear here as customers place them, with the status
              changes available at each stage.
            </p>
          </section>
        ) : (
          <section className="mt-16 flex flex-col">
            {bookings.map((b) => (
              <AdminBookingRow
                key={b.id}
                booking={{
                  id: b.id,
                  reference: b.reference,
                  brand: b.brand,
                  model: b.model,
                  start_date: iso(b.start_date),
                  end_date: iso(b.end_date),
                  total_amount: b.total_amount,
                  status: b.status,
                  delivery_mode: b.delivery_mode,
                  delivery_status: b.delivery_status,
                }}
              />
            ))}
          </section>
        )}
    </StackPanel>
  );
}
