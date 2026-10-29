import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { StackPanel } from '@/components/motion/StackPanel';
import { Annotation } from '@/components/ui/Annotation';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { CarPhoto } from '@/components/ui/CarPhoto';
import { CancelBookingButton } from '@/components/sections/CancelBookingButton';
import { getSession } from '@/lib/auth/guards';
import { listUserBookings, type BookingRow } from '@/lib/services/bookings';
import { formatCurrency } from '@/lib/services/pricing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your bookings' };

const formatDate = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const DELIVERY_LABEL: Record<string, string> = {
  pending: 'Being prepared',
  out_for_delivery: 'On its way to you',
  delivered: 'Delivered',
  returned: 'Returned',
};

/** Matches sp_cancel_booking: not started, and the pickup day is still ahead. */
function canCancel(b: BookingRow, today: string): boolean {
  const start = new Date(b.start_date).toISOString().slice(0, 10);
  return (b.status === 'pending' || b.status === 'confirmed') && start > today;
}

const shortBranch = (name: string) => name.replace(/^D4Drive /, '');

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/bookings');

  let bookings: BookingRow[] | null = null;
  try {
    bookings = await listUserBookings(session.userId);
  } catch (error) {
    console.error('[bookings/page]', error);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <StackPanel tone="studio" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(2rem,4vw,4rem))]" aria-labelledby="journeys-title">
      <h1 id="journeys-title" className="t-mega">
        Your <span className="italic-safe inline-block italic">journeys</span>.
      </h1>

      {bookings === null ? (
        <div className="mt-16 max-w-[52ch]">
          <h2 className="t-sub">Your bookings could not be loaded.</h2>
          <p className="t-body mt-4 text-[var(--muted)]">The database did not respond. This is on our side, not yours. Reload in a moment.</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="relative mt-16 max-w-[52ch]">
          <h2 className="t-sub">Nothing booked yet.</h2>
          <p className="t-body mt-4 text-[var(--muted)]">
            When you reserve a car it shows up here, with its delivery status and an invoice you can download.
          </p>
          <ButtonLink href="/cars" size="lg" className="mt-10">
            Browse the fleet
          </ButtonLink>
          <Annotation tilt={-8} arrow="long" arrowClassName="mt-1 h-auto w-32 -scale-x-100 rotate-[10deg] text-[var(--accent-text)]" className="absolute -right-64 bottom-0 hidden w-56 text-[var(--accent-text)] lg:block">
            {'the fleet is\nright there.'}
          </Annotation>
        </div>
      ) : (
        <ol className="mt-16 flex flex-col">
          {bookings.map((b) => (
            <li key={b.id}>
              <article className="grid grid-cols-1 items-center gap-6 border-t border-[var(--ink)]/20 py-8 md:grid-cols-12 md:gap-8">
                <div className="md:col-span-3">
                  <CarPhoto src={b.image_url} name={`${b.brand} ${b.model}`} aspect="aspect-[3/2]" decorative />
                </div>
                <div className="md:col-span-4">
                  <h2 className="t-sub">
                    {b.brand} {b.model}
                  </h2>
                  <p className="t-label mt-3 text-[var(--muted)]">{b.reference}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="font-display text-xl font-light">
                    {formatDate(b.start_date)} to {formatDate(b.end_date)}
                  </p>
                  <p className="mt-1 font-body text-sm text-[var(--muted)]">
                    {b.days} {b.days === 1 ? 'day' : 'days'}, <span className="capitalize">{b.status}</span>
                  </p>
                  <p className="mt-1 font-body text-sm text-[var(--muted)]">
                    {b.delivery_mode === 'doorstep'
                      ? (DELIVERY_LABEL[b.delivery_status] ?? b.delivery_status)
                      : `Collect at ${shortBranch(b.pickup_branch ?? b.home_branch)}`}
                  </p>
                  {b.payment_status === 'refunded' && (
                    <p className="mt-1 font-body text-sm text-[var(--accent-text)]">Refunded in full</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 md:col-span-2 md:flex-col md:items-end">
                  <p className="font-display text-2xl font-light">{formatCurrency(Number(b.total_amount))}</p>
                  <div className="flex gap-3">
                    <a href={`/api/bookings/${b.id}/invoice`} className="keycap t-label">
                      <FileText aria-hidden className="h-4 w-4" strokeWidth={1.5} />
                      Invoice
                    </a>
                    {canCancel(b, today) && <CancelBookingButton bookingId={b.id} reference={b.reference} />}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </StackPanel>
  );
}
