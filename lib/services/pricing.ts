/**
 * Pricing.
 *
 * Money is computed in integer paise and converted to rupees only at the
 * boundary. Doing the arithmetic in floating point rupees means 0.1 + 0.2 is
 * not 0.3, and a booking total that is off by a paisa will not reconcile
 * against the payment row.
 */

export interface PricingInput {
  startDate: Date;
  endDate: Date;
  ratePerDay: number;
  deliveryFee: number;
}

export interface PriceBreakdown {
  days: number;
  ratePerDay: number;
  rentalAmount: number;
  deliveryFee: number;
  totalAmount: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days between two dates.
 *
 * Both are normalised to UTC midnight first. Without that, a booking made
 * across a daylight-saving boundary computes 2.958 days and rounds wrong, and
 * the customer is billed for a day they did not get.
 */
export function rentalDays(startDate: Date, endDate: Date): number {
  const start = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const days = Math.round((end - start) / MS_PER_DAY);

  // A same-day rental is still one billable day, never zero.
  return Math.max(1, days);
}

const toPaise = (rupees: number): number => Math.round(rupees * 100);
const toRupees = (paise: number): number => Math.round(paise) / 100;

export function calculatePrice(input: PricingInput): PriceBreakdown {
  const { startDate, endDate, ratePerDay, deliveryFee } = input;

  if (!Number.isFinite(ratePerDay) || ratePerDay <= 0) {
    throw new RangeError('ratePerDay must be a positive finite number');
  }
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    throw new RangeError('deliveryFee must be a non-negative finite number');
  }
  if (endDate <= startDate) {
    throw new RangeError('endDate must be after startDate');
  }

  const days = rentalDays(startDate, endDate);

  const ratePaise = toPaise(ratePerDay);
  const deliveryPaise = toPaise(deliveryFee);
  const rentalPaise = ratePaise * days;

  return {
    days,
    ratePerDay: toRupees(ratePaise),
    rentalAmount: toRupees(rentalPaise),
    deliveryFee: toRupees(deliveryPaise),
    totalAmount: toRupees(rentalPaise + deliveryPaise),
  };
}

/** Formats rupees for display. Never used for arithmetic. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
