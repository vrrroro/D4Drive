import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * Double-booking concurrency test.
 *
 * This is the one piece of logic in the project that unit tests cannot prove.
 * The race it targets only exists between two real connections contending for
 * the same rows, so it needs a live MySQL instance.
 *
 * Skips cleanly when no database is configured, so CI without MySQL stays
 * green rather than reporting a false failure. Run it locally with a seeded
 * database before shipping any change to the booking path.
 */

const CONFIGURED = Boolean(process.env.DB_NAME && process.env.DB_HOST);

if (!CONFIGURED) {
  test('double booking prevention (skipped, no database configured)', { skip: true }, () => {});
} else {
  const { pool, execute, query } = await import('../lib/db.ts');
  const { createBooking } = await import('../lib/services/bookings.ts');
  const { CarUnavailableError } = await import('../lib/services/availability.ts');

  let userId: number;
  let carId: number;

  before(async () => {
    const users = await query<RowDataPacket & { id: number }>(
      "SELECT id FROM users WHERE role = 'customer' LIMIT 1",
    );
    const cars = await query<RowDataPacket & { id: number }>(
      'SELECT id FROM cars WHERE is_active = 1 LIMIT 1',
    );

    assert.ok(users[0], 'seed data required: run database/seed.sql first');
    assert.ok(cars[0], 'seed data required: run database/seed.sql first');

    userId = users[0].id;
    carId = cars[0].id;

    // Clear any prior run so the test is repeatable.
    await execute(
      "DELETE FROM bookings WHERE car_id = ? AND start_date = '2027-06-01'",
      [carId],
    );
  });

  after(async () => {
    await execute(
      "DELETE FROM bookings WHERE car_id = ? AND start_date = '2027-06-01'",
      [carId],
    );
    await pool.end();
  });

  test('two concurrent bookings for the same car and dates produce exactly one', async () => {
    const input = {
      carId,
      startDate: '2027-06-01',
      endDate: '2027-06-05',
      delivery: { mode: 'self_pickup' as const },
      payment: { method: 'card' as const, cardLastFour: '4242' },
    };

    // Fired together, deliberately. Sequential calls would pass even with a
    // completely unlocked implementation, which is exactly why the naive
    // version of this test proves nothing.
    const results = await Promise.allSettled([
      createBooking(userId, input),
      createBooking(userId, input),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'exactly one booking should succeed');
    assert.equal(rejected.length, 1, 'exactly one booking should be refused');

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    assert.ok(
      reason instanceof CarUnavailableError,
      `expected CarUnavailableError, got ${reason?.constructor?.name}: ${reason?.message}`,
    );

    // And the database agrees with the return values.
    const rows = await query<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) AS total FROM bookings
        WHERE car_id = ? AND start_date = '2027-06-01'`,
      [carId],
    );
    assert.equal(Number(rows[0]?.total), 1);
  });

  test('a booking starting the day another ends does not conflict', async () => {
    // Strict inequality in the overlap test is what allows a same-day
    // handover. Using >= and <= would block every back-to-back rental and
    // quietly halve fleet utilisation.
    const first = await createBooking(userId, {
      carId,
      startDate: '2027-06-01',
      endDate: '2027-06-05',
      delivery: { mode: 'self_pickup' as const },
      payment: { method: 'upi' as const, upiHandle: 'ananya@okaxis' },
    });

    const second = await createBooking(userId, {
      carId,
      startDate: '2027-06-05',
      endDate: '2027-06-08',
      delivery: { mode: 'self_pickup' as const },
      payment: { method: 'upi' as const, upiHandle: 'ananya@okaxis' },
    });

    assert.ok(first.reference);
    assert.ok(second.reference);
    assert.notEqual(first.reference, second.reference);

    await execute("DELETE FROM bookings WHERE start_date = '2027-06-05' AND car_id = ?", [
      carId,
    ]);
  });
}
