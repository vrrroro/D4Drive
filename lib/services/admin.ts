import type { RowDataPacket } from 'mysql2/promise';
import { query, queryOne, execute } from '@/lib/db';
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
  is_active: number;
}

/** Includes deactivated cars, which the public catalog deliberately excludes. */
export async function listAllCars(): Promise<AdminCarRow[]> {
  return query<AdminCarRow>(
    `SELECT c.id, c.branch_id, b.name AS branch_name, c.brand, c.model, c.year,
            c.registration_no, c.fuel_type, c.transmission, c.seats,
            c.price_per_day, c.is_active
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
 * Soft delete.
 *
 * A hard delete would orphan the booking history a completed rental needs for
 * its invoice, and the foreign key would refuse it anyway.
 */
export async function deactivateCar(id: number): Promise<boolean> {
  const result = await execute('UPDATE cars SET is_active = 0 WHERE id = ?', [id]);
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

export async function updateBookingStatus(
  id: number,
  next: BookingStatus,
): Promise<boolean> {
  const current = await queryOne<StatusRow>('SELECT status FROM bookings WHERE id = ?', [
    id,
  ]);
  if (!current) return false;

  const allowed = BOOKING_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(next)) {
    throw new InvalidTransitionError(current.status, next);
  }

  const result = await execute('UPDATE bookings SET status = ? WHERE id = ?', [next, id]);
  return result.affectedRows > 0;
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

  // delivered_at is stamped by the transition rather than supplied by the
  // client, so the timestamp reflects when it actually happened.
  const result = await execute(
    `UPDATE deliveries
        SET status = ?, delivered_at = IF(? = 'delivered', NOW(), delivered_at)
      WHERE booking_id = ?`,
    [next, next, bookingId],
  );
  return result.affectedRows > 0;
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
