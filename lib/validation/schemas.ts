import { z } from 'zod';
import { BOOKING_STATUSES, DELIVERY_STATUSES } from '@/lib/constants';

/**
 * Boundary schemas.
 *
 * Every route handler parses its input here before anything else runs.
 * Unvalidated data never reaches a service or a query.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Not a real date');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a 10 digit Indian mobile number'),
  // Length is the control that matters. Character-class rules push people
  // toward predictable substitutions and measurably weaken real passwords.
  password: z
    .string()
    .min(12, 'Use at least 12 characters')
    .max(128, 'Keep it under 128 characters'),
  licenceNumber: z.string().trim().max(32).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: z.string().min(1, 'Enter your password').max(128),
});

export const carFilterSchema = z.object({
  brand: z.string().trim().max(60).optional(),
  fuel: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  seats: z.coerce.number().int().min(2).max(9).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  // Sort is an allowlisted key, never a column name from the client. A column
  // name cannot be a bound parameter, so this mapping is what keeps dynamic
  // ordering free of injection.
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'seats']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  // Capped, so a client cannot request the entire table in one call.
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const availabilityQuerySchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
});

export const createBookingSchema = z
  .object({
    carId: z.coerce.number().int().positive(),
    startDate: isoDate,
    endDate: isoDate,
    delivery: z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('self_pickup') }),
      z.object({
        mode: z.literal('doorstep'),
        addressLine: z.string().trim().min(6, 'Enter the full address').max(255),
        city: z.string().trim().min(2).max(80),
        pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6 digit pincode'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    ]),
    payment: z.discriminatedUnion('method', [
      z.object({
        method: z.literal('card'),
        // Simulated. Only the last four are ever persisted. See SECURITY.md.
        cardLastFour: z.string().regex(/^\d{4}$/),
      }),
      z.object({
        method: z.literal('upi'),
        upiHandle: z.string().trim().regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, 'Enter a valid UPI ID'),
      }),
    ]),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'The return date must be after the pickup date',
    path: ['endDate'],
  })
  .refine((data) => data.startDate >= new Date().toISOString().slice(0, 10), {
    message: 'Pickup cannot be in the past',
    path: ['startDate'],
  });

export const carInputSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  registrationNo: z.string().trim().min(4).max(20).toUpperCase(),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
  transmission: z.enum(['manual', 'automatic']),
  seats: z.coerce.number().int().min(2).max(9),
  pricePerDay: z.coerce.number().positive().max(1_000_000),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const bookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});

export const deliveryStatusSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CarFilterInput = z.infer<typeof carFilterSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CarInput = z.infer<typeof carInputSchema>;

/** Flattens zod issues into a field-keyed map for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    result[key] ??= issue.message;
  }
  return result;
}
