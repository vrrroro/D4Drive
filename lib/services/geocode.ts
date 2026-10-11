/**
 * Address search and reverse geocoding, through OpenStreetMap's Nominatim.
 *
 * Called from our own API route only (app/api/geocode), never from the
 * browser: the page's CSP keeps `connect-src 'self'`, and the visitor's
 * address goes to one third party, from our server, with no cookies.
 *
 * Nominatim's usage policy (operations.osmfoundation.org/policies/nominatim)
 * asks for at most one request a second, an identifying User-Agent, and
 * cached results. All three are done here: requests are queued 1.1s apart,
 * answers are kept for a day, and searches are boxed to Bengaluru, the only
 * place D4Drive delivers.
 */

export interface Place {
  label: string;
  latitude: number;
  longitude: number;
  addressLine: string;
  city: string;
  pincode: string | null;
}

export class GeocodeUnavailableError extends Error {
  constructor() {
    super('Address search is unavailable right now.');
    this.name = 'GeocodeUnavailableError';
  }
}

const BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'D4Drive/1.0 (car rental coursework demo; https://github.com/vrrroro/D4Drive)';
/** Greater Bengaluru, as left, top, right, bottom. */
const VIEWBOX = '77.30,13.30,77.95,12.70';
const SPACING_MS = 1100;
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;
const cache = new Map<string, { at: number; value: Place[] }>();

/** One request at a time, at least SPACING_MS apart. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequest + SPACING_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    return task();
  });
  // Keep the chain alive whatever this task does.
  queue = run.catch(() => undefined);
  return run;
}

interface NominatimAddress {
  house_number?: string;
  house_name?: string;
  building?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state_district?: string;
  postcode?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
}

function toPlace(p: NominatimPlace): Place | null {
  const latitude = Number(p.lat);
  const longitude = Number(p.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const a = p.address ?? {};
  const street = [a.house_number ?? a.house_name ?? a.building, a.road].filter(Boolean).join(', ');
  const area = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district;
  const addressLine = [street || p.name, area].filter(Boolean).join(', ') || p.display_name.split(',').slice(0, 3).join(',');
  const pincode = a.postcode && /^[1-9]\d{5}$/.test(a.postcode.replace(/\s/g, '')) ? a.postcode.replace(/\s/g, '') : null;
  return {
    // The full Nominatim name ends in district, state, pincode and country;
    // the first four parts are what a person recognises.
    label: p.display_name.split(',').slice(0, 4).join(',').trim(),
    latitude: Math.round(latitude * 1e6) / 1e6,
    longitude: Math.round(longitude * 1e6) / 1e6,
    addressLine: addressLine.slice(0, 255),
    city: a.city ?? a.town ?? a.village ?? a.state_district ?? 'Bengaluru',
    pincode,
  };
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-IN,en' },
    signal: AbortSignal.timeout(6000),
    cache: 'no-store',
  });
  if (!response.ok) throw new GeocodeUnavailableError();
  return response.json();
}

function cached(key: string): Place[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function remember(key: string, value: Place[]): Place[] {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Places in Bengaluru matching a typed address, best first. */
export async function searchPlaces(text: string): Promise<Place[]> {
  const q = text.trim().replace(/\s+/g, ' ');
  const key = `s:${q.toLowerCase()}`;
  const hit = cached(key);
  if (hit) return hit;

  const url = new URL('/search', BASE);
  url.search = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'in',
    viewbox: VIEWBOX,
    bounded: '1',
  }).toString();

  try {
    const body = await throttled(() => fetchJson(url));
    const places = (Array.isArray(body) ? (body as NominatimPlace[]) : []).map(toPlace).filter((p): p is Place => p !== null);
    return remember(key, places);
  } catch (error) {
    if (error instanceof GeocodeUnavailableError) throw error;
    throw new GeocodeUnavailableError();
  }
}

/** The address at a point, for a pin dropped on the map. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<Place | null> {
  // About 11 m: close enough to share an answer, far enough to cache well.
  const key = `r:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const hit = cached(key);
  if (hit) return hit[0] ?? null;

  const url = new URL('/reverse', BASE);
  url.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  }).toString();

  try {
    const body = (await throttled(() => fetchJson(url))) as NominatimPlace & { error?: string };
    const place = body && !body.error ? toPlace(body) : null;
    // The pin is where the customer put it; the address only describes it.
    const pinned = place ? { ...place, latitude, longitude } : null;
    remember(key, pinned ? [pinned] : []);
    return pinned;
  } catch (error) {
    if (error instanceof GeocodeUnavailableError) throw error;
    throw new GeocodeUnavailableError();
  }
}
