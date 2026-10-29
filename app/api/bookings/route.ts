import { NextResponse } from 'next/server';
import { createBookingSchema, fieldErrors } from '@/lib/validation/schemas';
import { createBooking, listUserBookings, DeliveryUnavailableError } from '@/lib/services/bookings';
import { CarUnavailableError, CarNotFoundError } from '@/lib/services/availability';
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
    // 409 rather than 500: losing a race for the same dates is an expected
    // outcome of a correctly locked booking flow, not a server fault.
    if (error instanceof CarUnavailableError) {
      return errors.conflict(error.message);
    }
    if (error instanceof CarNotFoundError) {
      return errors.notFound(error.message);
    }
    if (error instanceof DeliveryUnavailableError) {
      return errors.badRequest(error.message);
    }
    return handleRouteError('bookings/create', error);
  }
}
