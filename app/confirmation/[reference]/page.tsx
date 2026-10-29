import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { RowDataPacket } from 'mysql2/promise';
import { StackPanel } from '@/components/motion/StackPanel';
import { Annotation } from '@/components/ui/Annotation';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { buttonClassName, ButtonContent } from '@/components/ui/button-styles';
import { getSession } from '@/lib/auth/guards';
import { queryOne } from '@/lib/db';
import { formatCurrency } from '@/lib/services/pricing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Booked' };

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

const formatDate = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function ConfirmationPage({ params }: { params: Promise<{ reference: string }> }) {
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
    <StackPanel tone="hot" className="panel min-h-[100dvh] pt-[calc(var(--header-h)+clamp(3rem,6vw,6rem))]" aria-labelledby="booked-title">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 id="booked-title" className="t-mega">
            You&apos;re booked.
          </h1>
          <p className="t-eyebrow mt-14 text-[var(--color-blush)]">Reference</p>
          <div className="relative mt-2 inline-block">
            <p className="t-condensed text-[clamp(5rem,14vw,14rem)] text-[var(--color-paper)] [text-shadow:0.02em_0.02em_0_var(--color-oxblood)]">
              {booking.reference}
            </p>
            <Annotation
              tilt={-10}
              arrow="swoop"
              arrowClassName="h-auto w-24 -scale-x-100 rotate-[60deg] text-[var(--color-blush)]"
              className="absolute -right-56 -top-6 hidden w-52 text-[var(--color-blush)] md:block"
            >
              {'keep this one.\nthe keys know it.'}
            </Annotation>
          </div>
        </div>

        <div className="lg:col-span-5 lg:pt-6">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 border-t border-[var(--color-blush)]/35 pt-8">
            <Item label="Car" value={`${booking.brand} ${booking.model}`} />
            <Item label="Total paid" value={formatCurrency(Number(booking.total_amount))} />
            <Item label="Pickup" value={formatDate(booking.start_date)} />
            <Item label="Return" value={formatDate(booking.end_date)} />
            <Item label="Handover" value={booking.delivery_mode === 'doorstep' ? 'Delivered to you' : 'Collect from the branch'} />
            <Item label="Length" value={`${booking.days} ${booking.days === 1 ? 'day' : 'days'}`} />
          </dl>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            {/* A real link to a file, styled as a button: one element, one tab stop. */}
            <a href={`/api/bookings/${booking.id}/invoice`} className={buttonClassName({ variant: 'blush', size: 'lg' })}>
              <ButtonContent variant="blush">Download invoice</ButtonContent>
            </a>
            <ButtonLink href="/bookings" variant="secondary" onDark size="lg">
              My bookings
            </ButtonLink>
          </div>
        </div>
      </div>
    </StackPanel>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-label text-[var(--color-blush)]">{label}</dt>
      <dd className="mt-2 font-display text-2xl font-light">{value}</dd>
    </div>
  );
}
