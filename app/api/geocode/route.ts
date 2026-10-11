import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, errors, handleRouteError } from '@/lib/auth/guards';
import { clientKey, rateLimit } from '@/lib/auth/rate-limit';
import { GeocodeUnavailableError, reverseGeocode, searchPlaces } from '@/lib/services/geocode';

/**
 * Address search for the checkout's map (lib/services/geocode.ts).
 *
 *   GET /api/geocode?q=12th main indiranagar   places matching the text
 *   GET /api/geocode?lat=12.97&lon=77.64       the address at a dropped pin
 *
 * Signed-in visitors only (the checkout is), and 30 lookups a minute each,
 * so the shared allowance with OpenStreetMap is not one visitor's to spend.
 */

const search = z.object({ q: z.string().trim().min(3, 'Type a few more letters.').max(160) });
const reverse = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export async function GET(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const limit = rateLimit(`geocode:${auth.session.userId}:${clientKey(request)}`, 30, 60_000);
    if (!limit.allowed) return errors.tooMany(limit.retryAfterSeconds);

    const params = Object.fromEntries(new URL(request.url).searchParams);
    if ('q' in params) {
      const parsed = search.safeParse(params);
      if (!parsed.success) return errors.badRequest(parsed.error.issues[0]?.message);
      return NextResponse.json({ places: await searchPlaces(parsed.data.q) });
    }
    const parsed = reverse.safeParse(params);
    if (!parsed.success) return errors.badRequest('Send q, or lat and lon.');
    return NextResponse.json({ place: await reverseGeocode(parsed.data.lat, parsed.data.lon) });
  } catch (error) {
    if (error instanceof GeocodeUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return handleRouteError('geocode', error);
  }
}
