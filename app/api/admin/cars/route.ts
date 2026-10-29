import { NextResponse } from 'next/server';
import { carInputSchema, fieldErrors } from '@/lib/validation/schemas';
import { listAllCars, createCar } from '@/lib/services/admin';
import { requireAdmin, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    return NextResponse.json({ cars: await listAllCars() });
  } catch (error) {
    return handleRouteError('admin/cars/list', error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const body: unknown = await request.json().catch(() => null);
    if (body === null) return errors.badRequest('Send a JSON body.');

    const parsed = carInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check the highlighted fields.', fields: fieldErrors(parsed.error) },
        { status: 400 },
      );
    }

    const id = await createCar(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined;
    if (code === 'ER_DUP_ENTRY') {
      return errors.conflict('A car with that registration number already exists.');
    }
    // The branch id passed validation as a number but names no branch.
    if (code === 'ER_NO_REFERENCED_ROW_2') {
      return errors.badRequest('That branch does not exist.');
    }
    return handleRouteError('admin/cars/create', error);
  }
}
