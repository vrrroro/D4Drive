import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, rentalDays } from '../lib/services/pricing.ts';
import { haversineDistanceKm, quoteDelivery } from '../lib/services/distance.ts';

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

test('rentalDays counts whole days between dates', () => {
  assert.equal(rentalDays(utc('2026-03-01'), utc('2026-03-04')), 3);
  assert.equal(rentalDays(utc('2026-03-01'), utc('2026-03-02')), 1);
});

test('rentalDays bills a minimum of one day', () => {
  assert.equal(rentalDays(utc('2026-03-01'), utc('2026-03-01')), 1);
});

test('rentalDays survives a daylight-saving boundary', () => {
  // Local-time arithmetic across a DST shift yields 2.958 days and rounds
  // wrong, billing the customer for a day they did not get. Normalising to
  // UTC midnight first is what prevents that.
  const start = new Date('2026-03-28T00:00:00');
  const end = new Date('2026-03-31T00:00:00');
  assert.equal(rentalDays(start, end), 3);
});

test('calculatePrice multiplies rate by days and adds delivery', () => {
  const result = calculatePrice({
    startDate: utc('2026-03-01'),
    endDate: utc('2026-03-04'),
    ratePerDay: 1650,
    deliveryFee: 100,
  });

  assert.equal(result.days, 3);
  assert.equal(result.rentalAmount, 4950);
  assert.equal(result.deliveryFee, 100);
  assert.equal(result.totalAmount, 5050);
});

test('calculatePrice does not accumulate floating point error', () => {
  // 0.1 + 0.2 is not 0.3 in binary floating point. Computing in integer paise
  // is what keeps a booking total reconcilable against its payment row.
  const result = calculatePrice({
    startDate: utc('2026-03-01'),
    endDate: utc('2026-03-04'),
    ratePerDay: 1650.1,
    deliveryFee: 0.2,
  });

  assert.equal(result.rentalAmount, 4950.3);
  assert.equal(result.totalAmount, 4950.5);
});

test('calculatePrice rejects a reversed date range', () => {
  assert.throws(
    () =>
      calculatePrice({
        startDate: utc('2026-03-04'),
        endDate: utc('2026-03-01'),
        ratePerDay: 1650,
        deliveryFee: 0,
      }),
    RangeError,
  );
});

test('calculatePrice rejects a non-positive rate', () => {
  assert.throws(
    () =>
      calculatePrice({
        startDate: utc('2026-03-01'),
        endDate: utc('2026-03-02'),
        ratePerDay: 0,
        deliveryFee: 0,
      }),
    RangeError,
  );
});

test('haversine measures a known Bengaluru distance', () => {
  const indiranagar = { latitude: 12.971599, longitude: 77.641228 };
  const koramangala = { latitude: 12.934533, longitude: 77.626579 };

  const km = haversineDistanceKm(indiranagar, koramangala);
  assert.ok(km > 4.0 && km < 4.6, `expected roughly 4.3 km, got ${km.toFixed(2)}`);
});

test('haversine is zero for identical points', () => {
  const p = { latitude: 12.971599, longitude: 77.641228 };
  assert.equal(haversineDistanceKm(p, p), 0);
});

test('delivery is free inside the first tier', () => {
  const branch = { latitude: 12.971599, longitude: 77.641228 };
  const near = { latitude: 12.981599, longitude: 77.641228 };

  const quote = quoteDelivery(branch, near);
  assert.equal(quote.available, true);
  assert.equal(quote.fee, 0);
});

test('delivery charges the middle tier between 5 and 10 km', () => {
  const branch = { latitude: 12.971599, longitude: 77.641228 };
  const away = { latitude: 13.031599, longitude: 77.641228 };

  const quote = quoteDelivery(branch, away);
  assert.equal(quote.available, true);
  assert.equal(quote.fee, 100);
});

test('delivery is refused beyond the maximum radius', () => {
  const branch = { latitude: 12.971599, longitude: 77.641228 };
  const far = { latitude: 13.271599, longitude: 77.641228 };

  const quote = quoteDelivery(branch, far);
  assert.equal(quote.available, false);
  assert.equal(quote.fee, 0);
  assert.ok(quote.reason);
});
