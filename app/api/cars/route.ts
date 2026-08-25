import { NextResponse } from 'next/server';
import { carFilterSchema } from '@/lib/validation/schemas';
import { listCars } from '@/lib/services/cars';
import { errors, handleRouteError } from '@/lib/auth/guards';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());

    const parsed = carFilterSchema.safeParse(raw);
    if (!parsed.success) return errors.badRequest('Those filters are not valid.');

    const result = await listCars(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError('cars/list', error);
  }
}
