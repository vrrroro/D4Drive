import { NextResponse } from 'next/server';
import { availabilityQuerySchema } from '@/lib/validation/schemas';
import { isCarAvailable, bookedRanges } from '@/lib/services/availability';
import { errors, handleRouteError } from '@/lib/auth/guards';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const carId = Number(id);
    if (!Number.isInteger(carId) || carId <= 0) {
      return errors.badRequest('Invalid car id.');
    }

    const { searchParams } = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    if (!parsed.success) {
      // Without dates, return the blocked ranges so a calendar can render.
      const ranges = await bookedRanges(carId);
      return NextResponse.json({ ranges });
    }

    const { startDate, endDate } = parsed.data;
    if (endDate <= startDate) {
      return errors.badRequest('The return date must be after the pickup date.');
    }

    // Read-only. This is NOT the gate on an actual booking; that lives inside
    // the booking transaction where a row lock can be held.
    const available = await isCarAvailable(carId, startDate, endDate);
    return NextResponse.json({ available, startDate, endDate });
  } catch (error) {
    return handleRouteError('cars/availability', error);
  }
}
