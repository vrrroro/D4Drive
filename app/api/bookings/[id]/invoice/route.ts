import PDFDocument from 'pdfkit';
import { getBookingForUser } from '@/lib/services/bookings';
import { requireSession, errors, handleRouteError } from '@/lib/auth/guards';
import { parsePositiveId } from '@/lib/validation/id';

export const runtime = 'nodejs';

const rupees = (value: string | number) =>
  `Rs. ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * Invoice PDF.
 *
 * Authorisation is enforced by the query itself: getBookingForUser scopes to
 * the requesting user unless they are an admin. Fetching the row and then
 * checking ownership separately is the shape almost every insecure direct
 * object reference bug takes, so the check is not separable here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const bookingId = parsePositiveId(id);
    if (bookingId === null) {
      return errors.badRequest('Invalid booking id.');
    }

    const booking = await getBookingForUser(
      bookingId,
      auth.session.userId,
      auth.session.role === 'admin',
    );

    // 404 rather than 403 for someone else's booking. A 403 would confirm the
    // record exists, which lets an attacker enumerate valid ids.
    if (!booking) return errors.notFound('Booking not found.');

    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const INK = '#1A1A1A';
    const MUTED = '#6C6863';
    const CARMINE = '#A82519';

    doc.fillColor(INK).fontSize(28).text('D4Drive', { align: 'left' });
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text('DRIVE EASY. BOOK SMART. DELIVERED TO YOU.', { characterSpacing: 2 });

    doc.moveDown(2);
    doc.moveTo(56, doc.y).lineTo(539, doc.y).strokeColor(INK).lineWidth(1).stroke();
    doc.moveDown(1.5);

    doc.fillColor(MUTED).fontSize(8).text('INVOICE', { characterSpacing: 2 });
    doc.fillColor(INK).fontSize(18).text(booking.reference);

    doc.moveDown(1.5);
    doc.fillColor(INK).fontSize(11);
    doc.text(`${booking.brand} ${booking.model} (${booking.year})`);
    doc.fillColor(MUTED).fontSize(10);
    doc.text(
      `${formatDate(booking.start_date)} to ${formatDate(booking.end_date)}  ` +
        `(${booking.days} ${booking.days === 1 ? 'day' : 'days'})`,
    );
    doc.text(
      booking.delivery_mode === 'doorstep'
        ? `Doorstep delivery to ${booking.address_line ?? 'the given address'}`
        : 'Self pickup from branch',
    );

    doc.moveDown(2);
    doc.moveTo(56, doc.y).lineTo(539, doc.y).strokeColor('#CCCCCC').stroke();
    doc.moveDown(1);

    const line = (label: string, value: string, bold = false) => {
      const y = doc.y;
      doc.fillColor(bold ? INK : MUTED).fontSize(bold ? 13 : 10);
      doc.text(label, 56, y);
      doc.fillColor(bold ? CARMINE : INK).text(value, 300, y, { width: 239, align: 'right' });
      doc.moveDown(0.6);
    };

    line(`Rental, ${booking.days} x ${rupees(Number(booking.rental_amount) / booking.days)}`,
      rupees(booking.rental_amount));
    line('Delivery', Number(booking.delivery_fee) === 0 ? 'Free' : rupees(booking.delivery_fee));

    doc.moveDown(0.4);
    doc.moveTo(56, doc.y).lineTo(539, doc.y).strokeColor(INK).stroke();
    doc.moveDown(0.8);

    line('Total paid', rupees(booking.total_amount), true);

    doc.moveDown(3);
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .text(
        `Paid by ${booking.payment_method === 'card' ? 'card' : 'UPI'}. ` +
          'This payment was simulated for an academic project. No real transaction took place.',
        { width: 483 },
      );

    doc.end();
    const pdf = await done;

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="d4drive-${booking.reference}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError('bookings/invoice', error);
  }
}
