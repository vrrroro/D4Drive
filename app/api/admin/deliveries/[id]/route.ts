import { NextResponse } from 'next/server';
import { deliveryStatusSchema } from '@/lib/validation/schemas';
import { updateDeliveryStatus, InvalidTransitionError } from '@/lib/services/admin';
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
    const parsed = deliveryStatusSchema.safeParse(body);
    if (!parsed.success) return errors.badRequest('That is not a valid delivery status.');

    const updated = await updateDeliveryStatus(id, parsed.data.status);
    if (!updated) return errors.notFound('Delivery not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidTransitionError) return errors.badRequest(error.message);
    return handleRouteError('admin/deliveries/status', error);
  }
}
