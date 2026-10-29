import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '@/lib/db';
import { requireAdmin, errors, handleRouteError } from '@/lib/auth/guards';

/**
 * "Try it" on the admin database page: runs one stored function or a history
 * lookup and returns the SQL, the bound values and the rows, so the page can
 * show the whole flow from the operation to the result.
 *
 * Read-only. Each kind is a fixed statement; only validated values are bound.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.coerce.number().int().positive();

const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('availability'), carId: id, startDate: isoDate, endDate: isoDate }),
  z.object({ kind: z.literal('distance'), fromBranchId: id, toBranchId: id }),
  z.object({ kind: z.literal('history'), reference: z.string().trim().toUpperCase().regex(/^D4[A-Z0-9]{8}$/) }),
]);

const STATEMENTS = {
  availability: 'SELECT fn_car_available(?, ?, ?) AS available',
  distance: `SELECT a.name AS from_branch, b.name AS to_branch,
       fn_haversine_km(a.latitude, a.longitude, b.latitude, b.longitude) AS km,
       fn_delivery_fee(fn_haversine_km(a.latitude, a.longitude, b.latitude, b.longitude)) AS fee
  FROM branches a
  JOIN branches b ON b.id = ?
 WHERE a.id = ?`,
  history: `SELECT l.changed_at, COALESCE(l.from_status, 'new') AS from_status, l.to_status,
       l.reason, COALESCE(u.full_name, 'system') AS actor
  FROM booking_status_log l
  JOIN bookings b   ON b.id = l.booking_id
  LEFT JOIN users u ON u.id = l.actor_user_id
 WHERE b.reference = ?
 ORDER BY l.changed_at, l.id`,
} as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return errors.badRequest('Fill in every field.');

    const input = parsed.data;
    const params =
      input.kind === 'availability'
        ? [input.carId, input.startDate, input.endDate]
        : input.kind === 'distance'
          ? [input.toBranchId, input.fromBranchId]
          : [input.reference];

    const sql = STATEMENTS[input.kind];
    const started = performance.now();
    const rows = await query<RowDataPacket>(sql, params);
    const ms = Math.round((performance.now() - started) * 10) / 10;

    return NextResponse.json({ sql, params, rows, ms });
  } catch (error) {
    return handleRouteError('admin/database/try', error);
  }
}
