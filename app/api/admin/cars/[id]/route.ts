import { NextResponse } from 'next/server';
import { carInputSchema, fieldErrors } from '@/lib/validation/schemas';
import { updateCar, deleteCar } from '@/lib/services/admin';
import { requireAdmin, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';
import { parsePositiveId } from '@/lib/validation/id';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = parsePositiveId((await params).id);
    if (id === null) return errors.badRequest('Invalid car id.');

    const body: unknown = await request.json().catch(() => null);
    if (body === null) return errors.badRequest('Send a JSON body.');

    const parsed = carInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }

    const updated = await updateCar(id, parsed.data);
    if (!updated) return errors.notFound('Car not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined;
    if (code === 'ER_DUP_ENTRY') {
      return errors.conflict('A car with that registration number already exists.');
    }
    // The branch id passed validation as a number but names no branch.
    if (code === 'ER_NO_REFERENCED_ROW_2') {
      return errors.badRequest('That branch does not exist.');
    }
    return handleRouteError('admin/cars/update', error);
  }
}

/**
 * Permanent delete. Only a car nobody has ever booked: the bookings foreign
 * key (ON DELETE RESTRICT) refuses any other, and that refusal is the 409.
 * Withdrawing a car from the catalog is POST ./withdraw.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = parsePositiveId((await params).id);
    if (id === null) return errors.badRequest('Invalid car id.');

    const done = await deleteCar(id);
    if (!done) return errors.notFound('Car not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined;
    if (code === 'ER_ROW_IS_REFERENCED_2') {
      return errors.conflict('This car has bookings, so it stays on record. Withdraw it instead.');
    }
    return handleRouteError('admin/cars/delete', error);
  }
}
