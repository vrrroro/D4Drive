import { DELIVERY_TIERS, MAX_DELIVERY_KM } from '@/lib/constants';

const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two points, in kilometres.
 *
 * The `asin(sqrt(a))` form is used rather than `atan2` because it stays
 * numerically stable for the very small distances this application deals in.
 * A doorstep delivery is a handful of kilometres, and the naive spherical law
 * of cosines loses precision badly at that scale.
 */
export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface DeliveryQuote {
  available: boolean;
  distanceKm: number;
  fee: number;
  reason?: string;
}

/**
 * Tiered delivery fee.
 *
 * Note this is straight-line distance, not driving distance, and it will
 * under-report real travel. That is a deliberate simplification of the brief,
 * and it errs in the customer's favour, which is the right direction for a
 * rounding decision to fall.
 */
export function quoteDelivery(from: Coordinates, to: Coordinates): DeliveryQuote {
  const distanceKm = Math.round(haversineDistanceKm(from, to) * 100) / 100;

  if (distanceKm > MAX_DELIVERY_KM) {
    return {
      available: false,
      distanceKm,
      fee: 0,
      reason: `Doorstep delivery reaches ${MAX_DELIVERY_KM} km. This address is ${distanceKm.toFixed(1)} km from the branch.`,
    };
  }

  const tier = DELIVERY_TIERS.find((t) => distanceKm <= t.maxKm);

  return {
    available: true,
    distanceKm,
    // The find cannot miss, because the guard above already rejected anything
    // beyond the last tier. The fallback keeps the type honest regardless.
    fee: tier?.fee ?? 0,
  };
}
