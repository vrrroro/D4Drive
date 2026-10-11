import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * The stored programs in database/routines.sql, against a real MySQL.
 *
 * Skips without a database, like the double-booking test. Every row a test
 * creates uses dates in 2028 or a TEST registration and is deleted again
 * (deleting a booking cascades to its delivery, payment and history).
 */

const CONFIGURED = Boolean(process.env.DB_NAME && process.env.DB_HOST);

if (!CONFIGURED) {
  test('stored programs (skipped, no database configured)', { skip: true }, () => {});
} else {
  const { pool, query, queryOne, execute } = await import('../lib/db.ts');
  const { createBooking, cancelBooking } = await import('../lib/services/bookings.ts');
  const { runEndOfDayClose } = await import('../lib/services/operations.ts');
  const { quoteDelivery, haversineDistanceKm } = await import('../lib/services/distance.ts');
  const { dbErrno, DB_ERRNO } = await import('../lib/services/db-errors.ts');

  let customerId: number;
  let otherCustomerId: number;
  let adminId: number;
  let carId: number;

  const cleanUp = () =>
    execute("DELETE FROM bookings WHERE start_date >= '2028-01-01' OR reference LIKE 'D4TST%'");

  before(async () => {
    const customers = await query<RowDataPacket & { id: number }>(
      "SELECT id FROM users WHERE role = 'customer' ORDER BY id LIMIT 2",
    );
    const admin = await queryOne<RowDataPacket & { id: number }>(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1",
    );
    const car = await queryOne<RowDataPacket & { id: number }>(
      'SELECT id FROM cars WHERE is_active = 1 ORDER BY id LIMIT 1',
    );
    assert.ok(customers.length === 2 && admin && car, 'seed data required: run npm run db:setup');
    customerId = customers[0]!.id;
    otherCustomerId = customers[1]!.id;
    adminId = admin.id;
    carId = car.id;
    await cleanUp();
  });

  after(async () => {
    await cleanUp();
    await execute("DELETE FROM cars WHERE registration_no LIKE 'TS%'");
    await pool.end();
  });

  const book = (startDate: string, endDate: string) =>
    createBooking(customerId, {
      carId,
      startDate,
      endDate,
      delivery: { mode: 'self_pickup' },
      payment: { method: 'card', cardLastFour: '4242' },
    });

  test('fn_haversine_km and fn_delivery_fee agree with the TypeScript quote', async () => {
    const from = { latitude: 12.971599, longitude: 77.641228 };
    for (const to of [
      { latitude: 12.9679, longitude: 77.6555 },   // 1.6 km, free
      { latitude: 12.925, longitude: 77.5938 },    // 7.3 km, 100
      { latitude: 12.9299, longitude: 77.5826 },   // about 7.9 km
      { latitude: 12.8452, longitude: 77.6602 },   // about 14 km, 200
      { latitude: 13.1007, longitude: 77.5963 },   // about 15.2 km, refused
    ]) {
      const row = await queryOne<RowDataPacket & { km: string; fee: string | null }>(
        'SELECT fn_haversine_km(?, ?, ?, ?) AS km, fn_delivery_fee(fn_haversine_km(?, ?, ?, ?)) AS fee',
        [from.latitude, from.longitude, to.latitude, to.longitude, from.latitude, from.longitude, to.latitude, to.longitude],
      );
      const quote = quoteDelivery(from, to);
      assert.ok(Math.abs(Number(row?.km) - haversineDistanceKm(from, to)) < 0.01, 'distance');
      if (quote.available) assert.equal(Number(row?.fee), quote.fee, `fee at ${quote.distanceKm} km`);
      else assert.equal(row?.fee, null, `refused at ${quote.distanceKm} km`);
    }
  });

  test('fn_car_available sees an overlap and allows a same-day handover', async () => {
    await book('2028-03-01', '2028-03-04');
    const check = async (s: string, e: string) =>
      (await queryOne<RowDataPacket & { a: number }>('SELECT fn_car_available(?, ?, ?) AS a', [carId, s, e]))?.a;
    assert.equal(await check('2028-03-03', '2028-03-06'), 0);
    assert.equal(await check('2028-03-04', '2028-03-06'), 1);
    assert.equal(await check('2028-02-27', '2028-03-01'), 1);
    await cleanUp();
  });

  test('a new booking gets its first history row from the insert trigger', async () => {
    const created = await book('2028-04-01', '2028-04-03');
    const log = await query<RowDataPacket & { from_status: string | null; to_status: string; actor_user_id: number; reason: string }>(
      'SELECT from_status, to_status, actor_user_id, reason FROM booking_status_log WHERE booking_id = ?',
      [created.id],
    );
    assert.equal(log.length, 1);
    assert.equal(log[0]!.from_status, null);
    assert.equal(log[0]!.to_status, 'confirmed');
    assert.equal(log[0]!.actor_user_id, customerId);
    assert.equal(log[0]!.reason, 'booked online');
    await cleanUp();
  });

  test('cancelling refunds the payment and logs who cancelled', async () => {
    const created = await book('2028-05-01', '2028-05-03');

    await assert.rejects(cancelBooking(created.id, otherCustomerId, false), (e) => dbErrno(e) === DB_ERRNO.bookingNotFound);

    const result = await cancelBooking(created.id, customerId, false);
    assert.equal(result.refundedAmount, created.totalAmount);

    const payment = await queryOne<RowDataPacket & { status: string; refunded_at: Date | null }>(
      'SELECT status, refunded_at FROM payments WHERE booking_id = ?',
      [created.id],
    );
    assert.equal(payment?.status, 'refunded');
    assert.ok(payment?.refunded_at);

    const last = await queryOne<RowDataPacket & { to_status: string; actor_user_id: number; reason: string }>(
      'SELECT to_status, actor_user_id, reason FROM booking_status_log WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
      [created.id],
    );
    assert.equal(last?.to_status, 'cancelled');
    assert.equal(last?.actor_user_id, customerId);
    assert.equal(last?.reason, 'cancelled by customer');

    await assert.rejects(cancelBooking(created.id, customerId, false), (e) => dbErrno(e) === DB_ERRNO.cannotCancel);
    await cleanUp();
  });

  test('the end-of-day cursor moves a finished confirmed booking through active to completed', async () => {
    // A booking whose whole period has passed, still confirmed: the cursor
    // must take it through both steps, in order.
    await execute('SET @d4d_actor_id = NULL, @d4d_reason = NULL');
    const inserted = await execute(
      `INSERT INTO bookings (reference, user_id, car_id, start_date, end_date, days, rate_per_day,
                             rental_amount, delivery_fee, total_amount, status)
       SELECT 'D4TSTEOD01', ?, ?, CURDATE() - INTERVAL 3 DAY, CURDATE() - INTERVAL 1 DAY, 2,
              price_per_day, 2 * price_per_day, 0, 2 * price_per_day, 'confirmed'
         FROM cars WHERE id = ?`,
      [customerId, carId, carId],
    );
    const bookingId = inserted.insertId;
    await execute(
      "INSERT INTO deliveries (booking_id, mode, pickup_branch_id) SELECT ?, 'self_pickup', branch_id FROM cars WHERE id = ?",
      [bookingId, carId],
    );

    const result = await runEndOfDayClose(adminId);
    const mine = result.steps.filter((s) => s.reference === 'D4TSTEOD01');
    assert.deepEqual(
      mine.map((s) => `${s.fromStatus}>${s.toStatus}`),
      ['confirmed>active', 'active>completed'],
    );

    const history = await query<RowDataPacket & { to_status: string; reason: string; actor_user_id: number }>(
      'SELECT to_status, reason, actor_user_id FROM booking_status_log WHERE booking_id = ? ORDER BY id',
      [bookingId],
    );
    assert.deepEqual(history.map((h) => h.to_status), ['confirmed', 'active', 'completed']);
    assert.equal(history[2]!.reason, 'end-of-day close');
    assert.equal(history[2]!.actor_user_id, adminId);

    // A second run the same day finds nothing more to do for it.
    const again = await runEndOfDayClose(adminId);
    assert.equal(again.steps.filter((s) => s.reference === 'D4TSTEOD01').length, 0);
    await execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
  });

  test('a car with a confirmed rental cannot be withdrawn', async () => {
    await book('2028-06-01', '2028-06-03');
    await assert.rejects(
      execute('UPDATE cars SET is_active = 0 WHERE id = ?', [carId]),
      (e) => dbErrno(e) === DB_ERRNO.carInUse,
    );
    await cleanUp();
  });

  test('a booked car cannot be deleted; a never-booked one can', async () => {
    await assert.rejects(
      execute('DELETE FROM cars WHERE id = ?', [carId]),
      (e: unknown) => (e as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2',
    );
    const added = await execute(
      `INSERT INTO cars (branch_id, brand, model, year, registration_no, fuel_type, price_per_day)
       VALUES (1, 'Test', 'Car', 2024, 'TS01AB1234', 'petrol', 999)`,
    );
    const removed = await execute('DELETE FROM cars WHERE id = ?', [added.insertId]);
    assert.equal(removed.affectedRows, 1);
  });

  test('CHECK constraints refuse rows the app would never write', async () => {
    const violates = (e: unknown) => (e as { code?: string }).code === 'ER_CHECK_CONSTRAINT_VIOLATED';
    // A total that does not add up.
    await assert.rejects(
      execute(
        `INSERT INTO bookings (reference, user_id, car_id, start_date, end_date, days, rate_per_day,
                               rental_amount, delivery_fee, total_amount)
         VALUES ('D4TSTCHK01', ?, ?, '2028-07-01', '2028-07-03', 2, 1000, 2000, 0, 1999)`,
        [customerId, carId],
      ),
      violates,
    );
    // Days that do not match the dates.
    await assert.rejects(
      execute(
        `INSERT INTO bookings (reference, user_id, car_id, start_date, end_date, days, rate_per_day,
                               rental_amount, delivery_fee, total_amount)
         VALUES ('D4TSTCHK02', ?, ?, '2028-07-01', '2028-07-03', 3, 1000, 3000, 0, 3000)`,
        [customerId, carId],
      ),
      violates,
    );
    // A mobile number that is not Indian.
    await assert.rejects(
      execute(
        "INSERT INTO users (full_name, email, phone, password_hash) VALUES ('Test User', 'tst@example.in', '12345', 'x')",
      ),
      violates,
    );
  });

  test('sp_create_booking refuses an address beyond 15 km and a closed branch', async () => {
    await assert.rejects(
      createBooking(customerId, {
        carId,
        startDate: '2028-08-01',
        endDate: '2028-08-02',
        delivery: { mode: 'doorstep', addressLine: '5, Yelahanka New Town', city: 'Bengaluru', pincode: '560064', latitude: 13.1007, longitude: 77.5963 },
        payment: { method: 'upi', upiHandle: 'test@okaxis' },
      }),
      (e) => dbErrno(e) === DB_ERRNO.outOfRange,
    );
    const closed = await queryOne<RowDataPacket & { id: number }>('SELECT id FROM branches WHERE is_active = 0 LIMIT 1');
    assert.ok(closed);
    await assert.rejects(
      createBooking(customerId, {
        carId,
        startDate: '2028-08-01',
        endDate: '2028-08-02',
        delivery: { mode: 'self_pickup', pickupBranchId: closed.id },
        payment: { method: 'upi', upiHandle: 'test@okaxis' },
      }),
      (e) => dbErrno(e) === DB_ERRNO.branchClosed,
    );
  });
}
