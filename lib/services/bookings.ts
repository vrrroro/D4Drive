import type { RowDataPacket } from 'mysql2/promise';
import { callProcedure, query, queryOne } from '@/lib/db';
import type { CreateBookingInput } from '@/lib/validation/schemas';

/**
 * Booking reference.
 *
 * Random rather than sequential. A sequential public reference leaks the total
 * number of bookings placed and lets anyone enumerate other people's records
 * by incrementing a digit.
 */
function generateReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = 'D4';
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

export interface CreatedBooking {
  id: number;
  reference: string;
  days: number;
  rentalAmount: number;
  deliveryFee: number;
  totalAmount: number;
  distanceKm: number | null;
}

interface CreatedRow extends RowDataPacket {
  id: number;
  reference: string;
  days: number;
  rental_amount: string;
  delivery_fee: string;
  total_amount: string;
  distance_km: string;
}

/**
 * Creates a booking, its delivery record, and its payment record.
 *
 * All of it happens inside `sp_create_booking` (database/routines.sql), in one
 * transaction: lock the car row with FOR UPDATE, check the dates with
 * fn_car_available, price the delivery or collection with fn_haversine_km and
 * fn_delivery_fee, then insert the booking, the delivery and the payment.
 * Either all three rows land or none do. The lock is what prevents double
 * booking: a second call for the same car waits until the first commits and
 * then sees its booking.
 *
 * The rate always comes from the locked car row, never from the client.
 * Refusals arrive as errors the route maps to 404, 409 or 422
 * (lib/services/db-errors.ts).
 */
export async function createBooking(
  userId: number,
  input: CreateBookingInput,
): Promise<CreatedBooking> {
  const d = input.delivery;
  const p = input.payment;

  // A reference collision is astronomically unlikely (32^8), but it costs
  // nothing to try again with a fresh one rather than fail the customer.
  for (let attempt = 0; ; attempt += 1) {
    try {
      const [rows] = await callProcedure(
        'CALL sp_create_booking(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          generateReference(),
          userId,
          input.carId,
          input.startDate,
          input.endDate,
          d.mode,
          d.mode === 'self_pickup' ? (d.pickupBranchId ?? null) : null,
          d.mode === 'doorstep' ? d.addressLine : null,
          d.mode === 'doorstep' ? d.city : null,
          d.mode === 'doorstep' ? d.pincode : null,
          d.mode === 'doorstep' ? d.latitude : null,
          d.mode === 'doorstep' ? d.longitude : null,
          p.method,
          // Only the last four are ever persisted, never a full card number.
          p.method === 'card' ? p.cardLastFour : null,
          p.method === 'upi' ? p.upiHandle : null,
        ],
      );
      const row = rows?.[0] as CreatedRow | undefined;
      if (!row) throw new Error('sp_create_booking returned no row');

      return {
        id: row.id,
        reference: row.reference,
        days: row.days,
        rentalAmount: Number(row.rental_amount),
        deliveryFee: Number(row.delivery_fee),
        totalAmount: Number(row.total_amount),
        distanceKm: d.mode === 'doorstep' || Number(row.distance_km) > 0 ? Number(row.distance_km) : null,
      };
    } catch (error) {
      const duplicate =
        typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
      if (!duplicate || attempt >= 2) throw error;
    }
  }
}

export interface CancelledBooking {
  reference: string;
  refundedAmount: number;
}

interface CancelledRow extends RowDataPacket {
  reference: string;
  refunded_amount: string;
}

/**
 * Cancels a booking through `sp_cancel_booking`.
 *
 * The procedure checks ownership (a customer only their own, staff any), that
 * the booking has not started, and that a customer is not cancelling on the
 * pickup day. Its UPDATE fires trg_bookings_au_log (history) and
 * trg_bookings_au_refund (the payment becomes refunded).
 */
export async function cancelBooking(
  bookingId: number,
  actorId: number,
  isAdmin: boolean,
): Promise<CancelledBooking> {
  const [rows] = await callProcedure('CALL sp_cancel_booking(?, ?, ?)', [
    bookingId,
    actorId,
    isAdmin ? 1 : 0,
  ]);
  const row = rows?.[0] as CancelledRow | undefined;
  if (!row) throw new Error('sp_cancel_booking returned no row');
  return { reference: row.reference, refundedAmount: Number(row.refunded_amount) };
}

export interface BookingRow extends RowDataPacket {
  id: number;
  reference: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  start_date: Date;
  end_date: Date;
  days: number;
  rate_per_day: string;
  rental_amount: string;
  delivery_fee: string;
  total_amount: string;
  status: string;
  brand: string;
  model: string;
  year: number;
  image_url: string | null;
  registration_no: string;
  home_branch: string;
  delivery_mode: string;
  delivery_status: string;
  address_line: string | null;
  distance_km: string;
  pickup_branch: string | null;
  payment_status: string;
  payment_method: string;
  card_last_four: string | null;
  upi_handle: string | null;
  refunded_at: Date | null;
}

/** Every column the pages use, from the view in database/routines.sql. */
const BOOKING_SELECT = `
  SELECT id, reference, user_id, customer_name, customer_email,
         start_date, end_date, days, rate_per_day, rental_amount, delivery_fee,
         total_amount, status, brand, model, year, image_url, registration_no,
         home_branch, delivery_mode, delivery_status, address_line, distance_km,
         pickup_branch, payment_status, payment_method, card_last_four,
         upi_handle, refunded_at
    FROM v_booking_details`;

export async function listUserBookings(userId: number): Promise<BookingRow[]> {
  return query<BookingRow>(`${BOOKING_SELECT} WHERE user_id = ? ORDER BY created_at DESC`, [
    userId,
  ]);
}

/**
 * Fetches one booking, enforcing ownership.
 *
 * The ownership check is part of the query rather than a separate branch after
 * it. That makes it impossible to fetch the row and forget to check, which is
 * the shape almost every insecure-direct-object-reference bug takes.
 */
export async function getBookingForUser(
  bookingId: number,
  userId: number,
  isAdmin: boolean,
): Promise<BookingRow | null> {
  if (isAdmin) {
    return queryOne<BookingRow>(`${BOOKING_SELECT} WHERE id = ?`, [bookingId]);
  }
  return queryOne<BookingRow>(`${BOOKING_SELECT} WHERE id = ? AND user_id = ?`, [
    bookingId,
    userId,
  ]);
}

/** By public reference, scoped to its owner (the confirmation page). */
export async function getBookingByReference(
  reference: string,
  userId: number,
): Promise<BookingRow | null> {
  return queryOne<BookingRow>(`${BOOKING_SELECT} WHERE reference = ? AND user_id = ?`, [
    reference,
    userId,
  ]);
}

export async function listAllBookings(): Promise<BookingRow[]> {
  return query<BookingRow>(`${BOOKING_SELECT} ORDER BY created_at DESC LIMIT 200`);
}

export interface StatusLogRow extends RowDataPacket {
  id: number;
  booking_id: number;
  reference: string;
  from_status: string | null;
  to_status: string;
  reason: string;
  actor_name: string | null;
  changed_at: Date;
}

/**
 * A booking's history, as the triggers wrote it. Scoped like
 * getBookingForUser: a customer sees only their own booking's history.
 */
export async function getBookingHistory(
  bookingId: number,
  userId: number,
  isAdmin: boolean,
): Promise<StatusLogRow[]> {
  return query<StatusLogRow>(
    `SELECT l.id, l.booking_id, b.reference, l.from_status, l.to_status, l.reason,
            u.full_name AS actor_name, l.changed_at
       FROM booking_status_log l
       JOIN bookings b ON b.id = l.booking_id
       LEFT JOIN users u ON u.id = l.actor_user_id
      WHERE l.booking_id = ? AND (? = 1 OR b.user_id = ?)
      ORDER BY l.changed_at, l.id`,
    [bookingId, isAdmin ? 1 : 0, userId],
  );
}
