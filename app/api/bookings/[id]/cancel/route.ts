import { NextResponse } from 'next/server';
import { cancelBooking } from '@/lib/services/bookings';
import { requireSession, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';
import { parsePositiveId } from '@/lib/validation/id';

/**
 * Customer cancellation, from My bookings.
 *
 * sp_cancel_booking does the checks (own booking, not started, not on the
 * pickup day) and the update; its triggers write the history row and refund
 * the payment. Someone else's booking answers 404, never 403.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = parsePositiveId((await params).id);
    if (id === null) return errors.badRequest('Invalid booking id.');

    const result = await cancelBooking(id, auth.session.userId, auth.session.role === 'admin');
    return NextResponse.json({ cancelled: result });
  } catch (error) {
    return handleRouteError('bookings/cancel', error);
  }
}
