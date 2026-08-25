import { NextResponse } from 'next/server';
import { carInputSchema, fieldErrors } from '@/lib/validation/schemas';
import { updateCar, deactivateCar } from '@/lib/services/admin';
import { requireAdmin, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = parseId((await params).id);
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
    return handleRouteError('admin/cars/update', error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const id = parseId((await params).id);
    if (id === null) return errors.badRequest('Invalid car id.');

    // Soft delete. Booking history depends on the row surviving.
    const done = await deactivateCar(id);
    if (!done) return errors.notFound('Car not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError('admin/cars/deactivate', error);
  }
}
