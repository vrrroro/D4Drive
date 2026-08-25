import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { withTransaction, query, queryOne } from '@/lib/db';
import { assertAvailableForUpdate } from '@/lib/services/availability';
import { calculatePrice } from '@/lib/services/pricing';
import { quoteDelivery } from '@/lib/services/distance';
import type { CreateBookingInput } from '@/lib/validation/schemas';

interface BranchRow extends RowDataPacket {
  latitude: string;
  longitude: string;
}

export class DeliveryUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeliveryUnavailableError';
  }
}

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

/**
 * Creates a booking, its delivery record, and its payment record.
 *
 * All three inserts share one transaction. A booking row without its payment
 * row is a corrupt record, so either all of it lands or none of it does.
 *
 * The availability check happens inside the transaction while holding a row
 * lock on the car, which is what actually prevents double booking. Checking
 * availability before opening the transaction would leave a window in which a
 * concurrent request books the same car between the read and the write.
 */
export async function createBooking(
  userId: number,
  input: CreateBookingInput,
): Promise<CreatedBooking> {
  return withTransaction(async (connection) => {
    const { pricePerDay, branchId } = await assertAvailableForUpdate(
      connection,
      input.carId,
      input.startDate,
      input.endDate,
    );

    let deliveryFee = 0;
    let distanceKm: number | null = null;

    if (input.delivery.mode === 'doorstep') {
      const [branchRows] = await connection.execute<BranchRow[]>(
        'SELECT latitude, longitude FROM branches WHERE id = ?',
        [branchId],
      );
      const branch = branchRows[0];
      if (!branch) throw new DeliveryUnavailableError('Branch location is unavailable.');

      const quote = quoteDelivery(
        { latitude: Number(branch.latitude), longitude: Number(branch.longitude) },
        { latitude: input.delivery.latitude, longitude: input.delivery.longitude },
      );

      if (!quote.available) {
        throw new DeliveryUnavailableError(
          quote.reason ?? 'Doorstep delivery is not available to that address.',
        );
      }

      deliveryFee = quote.fee;
      distanceKm = quote.distanceKm;
    }

    // Rate comes from the locked car row, never from the client. Trusting a
    // client-supplied price is how a booking gets placed for one rupee.
    const price = calculatePrice({
      startDate: new Date(`${input.startDate}T00:00:00Z`),
      endDate: new Date(`${input.endDate}T00:00:00Z`),
      ratePerDay: Number(pricePerDay),
      deliveryFee,
    });

    const reference = generateReference();

    const [bookingResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO bookings
         (reference, user_id, car_id, start_date, end_date, days,
          rate_per_day, rental_amount, delivery_fee, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        reference,
        userId,
        input.carId,
        input.startDate,
        input.endDate,
        price.days,
        price.ratePerDay,
        price.rentalAmount,
        price.deliveryFee,
        price.totalAmount,
      ],
    );

    const bookingId = bookingResult.insertId;

    const d = input.delivery;
    await connection.execute(
      `INSERT INTO deliveries
         (booking_id, mode, address_line, city, pincode, latitude, longitude,
          distance_km, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        bookingId,
        d.mode,
        d.mode === 'doorstep' ? d.addressLine : null,
        d.mode === 'doorstep' ? d.city : null,
        d.mode === 'doorstep' ? d.pincode : null,
        d.mode === 'doorstep' ? d.latitude : null,
        d.mode === 'doorstep' ? d.longitude : null,
        distanceKm,
      ],
    );

    const p = input.payment;
    await connection.execute(
      `INSERT INTO payments
         (booking_id, amount, method, status, reference, card_last_four, upi_handle, paid_at)
       VALUES (?, ?, ?, 'paid', ?, ?, ?, NOW())`,
      [
        bookingId,
        price.totalAmount,
        p.method,
        // Mock gateway reference. Not a real transaction id.
        `MOCK${reference}`,
        // Only the last four are ever persisted, never a full card number.
        p.method === 'card' ? p.cardLastFour : null,
        p.method === 'upi' ? p.upiHandle : null,
      ],
    );

    return {
      id: bookingId,
      reference,
      days: price.days,
      rentalAmount: price.rentalAmount,
      deliveryFee: price.deliveryFee,
      totalAmount: price.totalAmount,
      distanceKm,
    };
  });
}

export interface BookingRow extends RowDataPacket {
  id: number;
  reference: string;
  user_id: number;
  start_date: Date;
  end_date: Date;
  days: number;
  rental_amount: string;
  delivery_fee: string;
  total_amount: string;
  status: string;
  brand: string;
  model: string;
  year: number;
  image_url: string | null;
  delivery_mode: string;
  delivery_status: string;
  address_line: string | null;
  distance_km: string | null;
  payment_status: string;
  payment_method: string;
}

const BOOKING_SELECT = `
  SELECT bo.id, bo.reference, bo.user_id, bo.start_date, bo.end_date, bo.days,
         bo.rental_amount, bo.delivery_fee, bo.total_amount, bo.status,
         c.brand, c.model, c.year, c.image_url,
         d.mode AS delivery_mode, d.status AS delivery_status,
         d.address_line, d.distance_km,
         p.status AS payment_status, p.method AS payment_method
    FROM bookings bo
    JOIN cars c ON c.id = bo.car_id
    JOIN deliveries d ON d.booking_id = bo.id
    JOIN payments p ON p.booking_id = bo.id`;

export async function listUserBookings(userId: number): Promise<BookingRow[]> {
  return query<BookingRow>(
    `${BOOKING_SELECT} WHERE bo.user_id = ? ORDER BY bo.created_at DESC`,
    [userId],
  );
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
    return queryOne<BookingRow>(`${BOOKING_SELECT} WHERE bo.id = ?`, [bookingId]);
  }
  return queryOne<BookingRow>(`${BOOKING_SELECT} WHERE bo.id = ? AND bo.user_id = ?`, [
    bookingId,
    userId,
  ]);
}

export async function listAllBookings(): Promise<BookingRow[]> {
  return query<BookingRow>(`${BOOKING_SELECT} ORDER BY bo.created_at DESC LIMIT 200`);
}
