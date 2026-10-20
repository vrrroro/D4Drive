/**
 * Single source of truth for layering and business constants.
 *
 * Arbitrary `z-50` scattered through components is banned. Every layer reads
 * from Z below, so the stacking order is legible in one place.
 */

export const Z = {
  base: 0,
  gridlines: 10,
  nav: 20,
  // The car advisor's launcher and pane: over the page and the header,
  // under the boot loader (which covers it on the landing until the film is in).
  advisor: 40,
  // Above the sign-in panel it dissolves, below the loader. One fixed
  // full-viewport canvas shared by every particle job (components/fx).
  particles: 45,
  bootLoader: 50,
  toast: 60,
  grain: 70,
  // The cursor halo rides above everything, grain included.
  cursor: 80,
} as const;

/** Delivery fee tiers, in rupees, keyed by straight-line distance in km. */
export const DELIVERY_TIERS = [
  { maxKm: 5, fee: 0 },
  { maxKm: 10, fee: 100 },
  { maxKm: 15, fee: 200 },
] as const;

/** Beyond this distance doorstep delivery is not offered at all. */
export const MAX_DELIVERY_KM = 15;

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
] as const;

/**
 * Statuses that occupy a car for a date range. A cancelled or completed
 * booking must not block a future one, or a car becomes permanently
 * unbookable after its first rental.
 */
export const BLOCKING_STATUSES = ['pending', 'confirmed', 'active'] as const;

export const DELIVERY_STATUSES = [
  'pending',
  'out_for_delivery',
  'delivered',
  'returned',
] as const;

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
