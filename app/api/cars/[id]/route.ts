import { NextResponse } from 'next/server';
import { getCar } from '@/lib/services/cars';
import { errors, handleRouteError } from '@/lib/auth/guards';
import { parsePositiveId } from '@/lib/validation/id';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const carId = parsePositiveId(id);

    // A non-numeric id is a bad request, not a 500 from the query layer.
    if (carId === null) {
      return errors.badRequest('Invalid car id.');
    }

    const car = await getCar(carId);
    if (!car) return errors.notFound('That car is not in the fleet.');

    return NextResponse.json({ car });
  } catch (error) {
    return handleRouteError('cars/detail', error);
  }
}
