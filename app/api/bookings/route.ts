import { NextResponse } from 'next/server';
import { createBookingSchema, fieldErrors } from '@/lib/validation/schemas';
import { createBooking, listUserBookings } from '@/lib/services/bookings';
import { requireSession, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';

export async function GET() {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const bookings = await listUserBookings(auth.session.userId);
    return NextResponse.json({ bookings });
  } catch (error) {
    return handleRouteError('bookings/list', error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    if (!(await verifyCsrf(request))) {
      return errors.forbidden();
    }

    const body: unknown = await request.json().catch(() => null);
    if (body === null) return errors.badRequest('Send a JSON body.');

    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }

    const booking = await createBooking(auth.session.userId, parsed.data);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    // sp_create_booking refuses with its own codes, which handleRouteError
    // maps: 409 when another booking holds the dates (losing that race is an
    // expected outcome of a correctly locked flow, not a server fault), 404
    // for a withdrawn car, 422 for an address or branch out of range.
    return handleRouteError('bookings/create', error);
  }
}
