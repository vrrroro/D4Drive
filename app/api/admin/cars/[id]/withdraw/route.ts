import { NextResponse } from 'next/server';
import { deactivateCar } from '@/lib/services/admin';
import { requireAdmin, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';
import { parsePositiveId } from '@/lib/validation/id';

/**
 * Withdraw a car from the catalog (the soft delete). Its row stays, because
 * booking history and invoices point at it. trg_cars_bu_withdraw_guard
 * refuses with a 409 while the car has a confirmed or running rental.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = parsePositiveId((await params).id);
    if (id === null) return errors.badRequest('Invalid car id.');

    const done = await deactivateCar(id);
    if (!done) return errors.notFound('Car not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError('admin/cars/withdraw', error);
  }
}
