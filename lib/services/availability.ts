import type { RowDataPacket } from 'mysql2/promise';
import { query, queryOne } from '@/lib/db';
import { BLOCKING_STATUSES } from '@/lib/constants';

/**
 * Availability.
 *
 * The overlap rule lives in the database, in fn_car_available
 * (database/routines.sql):
 *
 *     existing.start_date < requested.end_date
 *     AND existing.end_date > requested.start_date
 *
 * Strict inequality on both sides is deliberate. It means a booking ending on
 * the 10th does not collide with one starting on the 10th, which is correct
 * for a same-day handover. Only pending, confirmed, and active bookings
 * block; cancelled and completed ones must not, or a car becomes permanently
 * unbookable after its first rental.
 *
 * The same function is the gate inside sp_create_booking, where it runs after
 * the car row is locked. Called on its own, as here, it is only a preview:
 * between this read and a booking, someone else can take the dates, and the
 * procedure's lock is what settles that.
 */

const BLOCKING_PLACEHOLDERS = BLOCKING_STATUSES.map(() => '?').join(', ');

interface AvailableRow extends RowDataPacket {
  available: number;
}

interface BookedRangeRow extends RowDataPacket {
  start_date: Date;
  end_date: Date;
}

/** Read-only preview for the detail page and the checkout. */
export async function isCarAvailable(
  carId: number,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const row = await queryOne<AvailableRow>('SELECT fn_car_available(?, ?, ?) AS available', [
    carId,
    startDate,
    endDate,
  ]);
  return row?.available === 1;
}

/** Date ranges already taken, for rendering a disabled-day calendar. */
export async function bookedRanges(
  carId: number,
): Promise<Array<{ start: string; end: string }>> {
  const rows = await query<BookedRangeRow>(
    `SELECT start_date, end_date
       FROM bookings
      WHERE car_id = ?
        AND status IN (${BLOCKING_PLACEHOLDERS})
        AND end_date >= CURDATE()
      ORDER BY start_date`,
    [carId, ...BLOCKING_STATUSES],
  );

  return rows.map((row) => ({
    start: row.start_date.toISOString().slice(0, 10),
    end: row.end_date.toISOString().slice(0, 10),
  }));
}
