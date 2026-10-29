import { NextResponse } from 'next/server';
import { runEndOfDayClose } from '@/lib/services/operations';
import { requireAdmin, verifyCsrf, errors, handleRouteError } from '@/lib/auth/guards';

/**
 * The end-of-day close, from the admin dashboard. Runs sp_end_of_day_close
 * (a cursor over due bookings) and returns what it changed, step by step.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    if (!(await verifyCsrf(request))) return errors.forbidden();

    const result = await runEndOfDayClose(auth.session.userId);
    return NextResponse.json({ result });
  } catch (error) {
    return handleRouteError('admin/operations/close', error);
  }
}
