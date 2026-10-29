import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { query, queryOne, execute, withActor } from '@/lib/db';
import { cancelBooking } from '@/lib/services/bookings';
import type { CarInput } from '@/lib/validation/schemas';
import type { BookingStatus, DeliveryStatus } from '@/lib/constants';

export interface DashboardStats {
  revenue: number;
  bookingsTotal: number;
  bookingsActive: number;
  fleetTotal: number;
  fleetActive: number;
  deliveriesPending: number;
}

interface StatRow extends RowDataPacket {
  revenue: string | null;
  bookings_total: number;
  bookings_active: number;
  fleet_total: number;
  fleet_active: number;
  deliveries_pending: number;
}

/**
 * Dashboard figures.
 *
 * Revenue counts paid payments only. Counting booking totals instead would
 * report money that was never collected, which is the kind of number that
 * looks fine on a dashboard and is wrong in a meeting.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const row = await queryOne<StatRow>(
    `SELECT
       (SELECT SUM(amount) FROM payments WHERE status = 'paid')            AS revenue,
       (SELECT COUNT(*) FROM bookings)                                      AS bookings_total,
       (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed','active')) AS bookings_active,
       (SELECT COUNT(*) FROM cars)                                          AS fleet_total,
       (SELECT COUNT(*) FROM cars WHERE is_active = 1)                      AS fleet_active,
       (SELECT COUNT(*) FROM deliveries WHERE status = 'pending')           AS deliveries_pending`,
  );

  return {
    revenue: Number(row?.revenue ?? 0),
    bookingsTotal: Number(row?.bookings_total ?? 0),
    bookingsActive: Number(row?.bookings_active ?? 0),
    fleetTotal: Number(row?.fleet_total ?? 0),
    fleetActive: Number(row?.fleet_active ?? 0),
    deliveriesPending: Number(row?.deliveries_pending ?? 0),
  };
}

export interface AdminCarRow extends RowDataPacket {
  id: number;
  branch_id: number;
  branch_name: string;
  brand: string;
  model: string;
  year: number;
  registration_no: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  price_per_day: string;
  image_url: string | null;
  description: string | null;
  is_active: number;
  booking_count: number;
}

/**
 * Includes deactivated cars, which the public catalog deliberately excludes.
 * booking_count decides whether the fleet page offers a permanent delete
 * (only a car nobody has ever booked).
 */
export async function listAllCars(): Promise<AdminCarRow[]> {
  return query<AdminCarRow>(
    `SELECT c.id, c.branch_id, b.name AS branch_name, c.brand, c.model, c.year,
            c.registration_no, c.fuel_type, c.transmission, c.seats,
            c.price_per_day, c.image_url, c.description, c.is_active,
            (SELECT COUNT(*) FROM bookings bo WHERE bo.car_id = c.id) AS booking_count
       FROM cars c
       JOIN branches b ON b.id = c.branch_id
      ORDER BY c.is_active DESC, c.brand, c.model`,
  );
}

export async function createCar(input: CarInput): Promise<number> {
  const result = await execute(
    `INSERT INTO cars
       (branch_id, brand, model, year, registration_no, fuel_type, transmission,
        seats, price_per_day, image_url, description, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.branchId,
      input.brand,
      input.model,
      input.year,
      input.registrationNo,
      input.fuelType,
      input.transmission,
      input.seats,
      input.pricePerDay,
      input.imageUrl || null,
      input.description ?? null,
      input.isActive ? 1 : 0,
    ],
  );
  return result.insertId;
}

export async function updateCar(id: number, input: CarInput): Promise<boolean> {
  const result = await execute(
    `UPDATE cars
        SET branch_id = ?, brand = ?, model = ?, year = ?, registration_no = ?,
            fuel_type = ?, transmission = ?, seats = ?, price_per_day = ?,
            image_url = ?, description = ?, is_active = ?
      WHERE id = ?`,
    [
      input.branchId,
      input.brand,
      input.model,
      input.year,
      input.registrationNo,
      input.fuelType,
      input.transmission,
      input.seats,
      input.pricePerDay,
      input.imageUrl || null,
      input.description ?? null,
      input.isActive ? 1 : 0,
      id,
    ],
  );
  return result.affectedRows > 0;
}

/**
 * Withdraw: the soft delete.
 *
 * The car leaves the catalog but keeps its row, because past bookings and
 * their invoices point at it. trg_cars_bu_withdraw_guard refuses (5201, a 409)
 * while the car has a confirmed or running rental.
 */
export async function deactivateCar(id: number): Promise<boolean> {
  const result = await execute('UPDATE cars SET is_active = 0 WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * Permanent delete, for a car entered by mistake.
 *
 * Only possible for a car nobody has booked: fk_bookings_car is ON DELETE
 * RESTRICT, so MySQL itself refuses (ER_ROW_IS_REFERENCED_2, a 409) for any
 * car with history. The app does not check first; the constraint is the rule.
 */
export async function deleteCar(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM cars WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * Legal booking status transitions.
 *
 * Encoded as a graph rather than checked ad hoc, so an admin cannot move a
 * cancelled booking back to active through a crafted request.
 */
const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`A booking cannot move from ${from} to ${to}.`);
    this.name = 'InvalidTransitionError';
  }
}

interface StatusRow extends RowDataPacket {
  status: BookingStatus;
}

/**
 * Moves a booking along the graph above.
 *
 * Cancelling goes through sp_cancel_booking, the same path a customer uses,
 * so the refund trigger and the history are identical whoever cancels. Every
 * other move is a plain UPDATE on a connection carrying the admin's id, which
 * trg_bookings_au_log records as the actor.
 */
export async function updateBookingStatus(
  id: number,
  next: BookingStatus,
  actorId: number,
): Promise<boolean> {
  const current = await queryOne<StatusRow>('SELECT status FROM bookings WHERE id = ?', [
    id,
  ]);
  if (!current) return false;

  const allowed = BOOKING_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(next)) {
    throw new InvalidTransitionError(current.status, next);
  }

  if (next === 'cancelled') {
    await cancelBooking(id, actorId, true);
    return true;
  }

  // Compare-and-set: the update only lands if the status is still the one
  // the transition was checked against. Two admins acting on one booking at
  // once cannot both pass the graph check and race each other's write.
  const affected = await withActor(actorId, `marked ${next} by staff`, async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      'UPDATE bookings SET status = ? WHERE id = ? AND status = ?',
      [next, id, current.status],
    );
    return result.affectedRows;
  });
  if (affected === 0) throw new InvalidTransitionError(current.status, next);
  return true;
}

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  pending: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  returned: [],
};

interface DeliveryStatusRow extends RowDataPacket {
  status: DeliveryStatus;
}

export async function updateDeliveryStatus(
  bookingId: number,
  next: DeliveryStatus,
): Promise<boolean> {
  const current = await queryOne<DeliveryStatusRow>(
    'SELECT status FROM deliveries WHERE booking_id = ?',
    [bookingId],
  );
  if (!current) return false;

  const allowed = DELIVERY_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(next)) {
    throw new InvalidTransitionError(current.status, next);
  }

  // delivered_at is stamped by trg_deliveries_bu_stamp, never supplied by
  // the client, so it records when the handover actually happened.
  // Compare-and-set, for the same reason as updateBookingStatus.
  const result = await execute(
    'UPDATE deliveries SET status = ? WHERE booking_id = ? AND status = ?',
    [next, bookingId, current.status],
  );
  if (result.affectedRows === 0) throw new InvalidTransitionError(current.status, next);
  return true;
}

interface BranchRow extends RowDataPacket {
  id: number;
  name: string;
  city: string;
}

export async function listBranches(): Promise<BranchRow[]> {
  return query<BranchRow>(
    'SELECT id, name, city FROM branches WHERE is_active = 1 ORDER BY name',
  );
}
