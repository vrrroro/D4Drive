import { NextResponse } from 'next/server';
import { bookingStatusSchema } from '@/lib/validation/schemas';
import { updateBookingStatus, InvalidTransitionError } from '@/lib/services/admin';
import { requireAdmin, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) return errors.badRequest('Invalid booking id.');

    const body: unknown = await request.json().catch(() => null);
    const parsed = bookingStatusSchema.safeParse(body);
    if (!parsed.success) return errors.badRequest('That is not a valid status.');

    const updated = await updateBookingStatus(id, parsed.data.status);
    if (!updated) return errors.notFound('Booking not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    // A rejected transition is the caller asking for something illegal, not a
    // server fault, so it is a 400 rather than a 500.
    if (error instanceof InvalidTransitionError) return errors.badRequest(error.message);
    return handleRouteError('admin/bookings/status', error);
  }
}
