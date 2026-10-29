import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { query } from '@/lib/db';
import { BLOCKING_STATUSES } from '@/lib/constants';

/**
 * Availability and double-booking prevention.
 *
 * The overlap test is:
 *
 *     existing.start_date < requested.end_date
 *     AND existing.end_date > requested.start_date
 *
 * Strict inequality on both sides is deliberate. It means a booking ending on
 * the 10th does not collide with one starting on the 10th, which is correct
 * for a same-day handover. Using >= and <= here would block every back-to-back
 * rental and quietly halve fleet utilisation.
 *
 * Only pending, confirmed, and active bookings block. Cancelled and completed
 * ones must not, or a car becomes permanently unbookable after its first
 * rental.
 */

const BLOCKING_PLACEHOLDERS = BLOCKING_STATUSES.map(() => '?').join(', ');

interface ConflictRow extends RowDataPacket {
  conflicts: number;
}

interface BookedRangeRow extends RowDataPacket {
  start_date: Date;
  end_date: Date;
}

/**
 * Read-only availability check for the catalog and the detail page.
 *
 * This is NOT safe to use as the gate on an actual booking insert. Between
 * this read and a subsequent write, another request can book the same car.
 * Use `assertAvailableForUpdate` inside a transaction for that.
 */
export async function isCarAvailable(
  carId: number,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const rows = await query<ConflictRow>(
    `SELECT COUNT(*) AS conflicts
       FROM bookings
      WHERE car_id = ?
        AND status IN (${BLOCKING_PLACEHOLDERS})
        AND start_date < ?
        AND end_date   > ?`,
    [carId, ...BLOCKING_STATUSES, endDate, startDate],
  );

  return (rows[0]?.conflicts ?? 0) === 0;
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

export class CarUnavailableError extends Error {
  constructor(message = 'This car is already booked for the selected dates.') {
    super(message);
    this.name = 'CarUnavailableError';
  }
}

export class CarNotFoundError extends Error {
  constructor(message = 'Car not found.') {
    super(message);
    this.name = 'CarNotFoundError';
  }
}

/**
 * The real gate. Must be called inside a transaction.
 *
 * The naive implementation reads availability, decides the car is free, then
 * inserts. Two concurrent requests both read "free" before either inserts, and
 * both succeed. The row lock below is what closes that window: the second
 * request blocks on `FOR UPDATE` until the first commits, and then sees the
 * booking it just wrote.
 *
 * MySQL has no exclusion constraint, so a unique index cannot express range
 * overlap. Pessimistic locking on the car row is the mechanism available.
 */
export async function assertAvailableForUpdate(
  connection: PoolConnection,
  carId: number,
  startDate: string,
  endDate: string,
): Promise<{ pricePerDay: string; branchId: number }> {
  const [carRows] = await connection.execute<
    (RowDataPacket & { id: number; price_per_day: string; branch_id: number })[]
  >(
    // Locking the car row serialises every booking attempt for this car.
    // Concurrent attempts on *different* cars do not contend, so this does not
    // serialise the whole booking endpoint.
    `SELECT id, price_per_day, branch_id
       FROM cars
      WHERE id = ? AND is_active = 1
      FOR UPDATE`,
    [carId],
  );

  const car = carRows[0];
  if (!car) {
    throw new CarNotFoundError();
  }

  const [conflictRows] = await connection.execute<ConflictRow[]>(
    `SELECT COUNT(*) AS conflicts
       FROM bookings
      WHERE car_id = ?
        AND status IN (${BLOCKING_PLACEHOLDERS})
        AND start_date < ?
        AND end_date   > ?`,
    [carId, ...BLOCKING_STATUSES, endDate, startDate],
  );

  if ((conflictRows[0]?.conflicts ?? 0) > 0) {
    throw new CarUnavailableError();
  }

  return { pricePerDay: car.price_per_day, branchId: car.branch_id };
}
