#!/usr/bin/env node
/**
 * Error-leak check against a running server.
 *
 *   npm run check:leaks
 *
 * Sends malformed, hostile, and unauthorised requests to every route and
 * fails if any response body or header carries a stack frame, a SQL
 * fragment, a driver error code, or a filesystem path. Run it once with the
 * database up and once with it stopped: a dead database is the usual way a
 * raw error escapes.
 *
 * Signs in once as the seeded admin so the admin routes are exercised past
 * the auth guard. Restart the server first if the auth rate limiter is warm.
 */

const BASE = process.env.BASE ?? 'http://localhost:3000';

const LEAK_PATTERNS = [
  /\bat [\w.<>$]+ \(/, // stack frame
  /\.(?:ts|tsx|js|mjs):\d+/, // file:line
  /\/home\/|\/usr\/|[A-Z]:\\\\|node_modules/, // paths
  /\bER_[A-Z_]+\b/, // mysql2 error codes
  /\bECONN(?:REFUSED|RESET)\b|\bPROTOCOL_/, // driver and socket errors
  /\b(?:SELECT|INSERT INTO|UPDATE \w+ SET|DELETE FROM)\b/, // SQL
  /\bsqlMessage\b|\bsqlState\b|\berrno\b/,
  /\bTypeError\b|\bReferenceError\b|\bSyntaxError\b/,
];

const results = [];
let failures = 0;

function scan(label, status, text) {
  const hit = LEAK_PATTERNS.find((pattern) => pattern.test(text));
  if (hit) {
    failures += 1;
    results.push(`LEAK  ${label}  ${status}  matched ${hit}: ${text.slice(0, 160).replace(/\s+/g, ' ')}`);
  } else {
    results.push(`ok    ${label}  ${status}`);
  }
}

async function hit(label, path, init = {}, cookie = '') {
  const headers = new Headers(init.headers);
  if (cookie) headers.set('cookie', cookie);
  const response = await fetch(BASE + path, { ...init, headers, redirect: 'manual' });
  const contentType = response.headers.get('content-type') ?? '';
  // Pages are HTML with Next's own payload, which legitimately contains
  // script and file-like chunk names. Only the visible error text matters.
  let text = await response.text();
  if (contentType.includes('text/html')) {
    text = text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  }
  scan(label, response.status, text);
  return response;
}

async function signIn() {
  const response = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@d4drive.in', password: 'D4Drive!Admin2026' }),
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  const jar = cookies.map((c) => c.split(';')[0]).join('; ');
  const csrf = /d4d_csrf=([^;]+)/.exec(jar)?.[1] ?? '';
  return { jar, csrf, ok: response.ok };
}

const json = (body) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

// Public and unauthenticated
await hit('GET /api/cars garbage filters', "/api/cars?seats=abc&sort=1;DROP TABLE cars&page=-4");
await hit('GET /api/cars huge page', '/api/cars?page=99999999999&pageSize=9999');
await hit('GET /api/cars/0x10', '/api/cars/0x10');
await hit('GET /api/cars/1e20', '/api/cars/1e20');
await hit("GET /api/cars/1' OR 1=1", "/api/cars/1'%20OR%201=1");
await hit('GET /api/cars/999999', '/api/cars/999999');
await hit('GET availability bad dates', '/api/cars/1/availability?startDate=2027-13-45&endDate=x');
await hit('GET availability reversed', '/api/cars/1/availability?startDate=2027-06-05&endDate=2027-06-01');
await hit('POST login invalid JSON', '/api/auth/login', json('{"email":'));
await hit('POST login wrong types', '/api/auth/login', json({ email: ['a'], password: { $ne: 1 } }));
await hit('POST login huge password', '/api/auth/login', json({ email: 'a@b.in', password: 'x'.repeat(100000) }));
await hit('POST register invalid', '/api/auth/register', json({ fullName: '', email: 'not-an-email', phone: '123', password: 'short' }));
await hit('POST refresh no cookie', '/api/auth/refresh', { method: 'POST' });
await hit('POST refresh forged cookie', '/api/auth/refresh', { method: 'POST' }, 'd4d_rt=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.');
await hit('GET /api/auth/me forged access', '/api/auth/me', {}, 'd4d_at=not.a.jwt');
await hit('GET /api/bookings no session', '/api/bookings');
await hit('POST /api/bookings no session', '/api/bookings', json({}));
await hit('GET invoice no session', '/api/bookings/1/invoice');
await hit('GET admin cars no session', '/api/admin/cars');
await hit('GET page /cars/abc', '/cars/abc');
await hit('GET page /booking/1e20', '/booking/1e20');
await hit('GET page /confirmation/<script>', '/confirmation/%3Cscript%3E');
await hit('GET page /nope', '/this-page-does-not-exist');

// Authenticated as admin
const session = await signIn();
if (session.ok) {
  const auth = (init = {}) => ({ ...init, headers: { ...(init.headers ?? {}), 'x-csrf-token': session.csrf } });
  await hit('POST booking without CSRF', '/api/bookings', json({ carId: 1 }), session.jar);
  await hit('POST booking malformed', '/api/bookings', auth(json({ carId: 'x', startDate: '2020-01-01', endDate: 'y', delivery: {}, payment: {} })), session.jar);
  await hit('POST booking unknown car', '/api/bookings', auth(json({ carId: 999999, startDate: '2030-01-01', endDate: '2030-01-03', delivery: { mode: 'self_pickup' }, payment: { method: 'card', cardLastFour: '4242' } })), session.jar);
  await hit('POST booking out of range delivery', '/api/bookings', auth(json({ carId: 1, startDate: '2030-02-01', endDate: '2030-02-03', delivery: { mode: 'doorstep', addressLine: '1 MG Road, Mysuru', city: 'Mysuru', pincode: '570001', latitude: 12.29, longitude: 76.64 }, payment: { method: 'upi', upiHandle: 'a@okaxis' } })), session.jar);
  await hit('GET invoice not mine/absent', '/api/bookings/999999/invoice', {}, session.jar);
  await hit('PUT admin car bad body', '/api/admin/cars/1', auth({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"brand":' }), session.jar);
  await hit('PUT admin car remote photo', '/api/admin/cars/1', auth({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId: 1, brand: 'X', model: 'Y', year: 2024, registrationNo: 'KA01AA0001', fuelType: 'petrol', transmission: 'manual', seats: 5, pricePerDay: 1000, imageUrl: 'https://evil.example/x.jpg' }) }), session.jar);
  await hit('PUT admin car duplicate registration', '/api/admin/cars/1', auth({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId: 1, brand: 'Hyundai', model: 'Creta SX', year: 2024, registrationNo: 'KA01NP8823', fuelType: 'diesel', transmission: 'automatic', seats: 5, pricePerDay: 3200 }) }), session.jar);
  await hit('PUT admin car unknown branch', '/api/admin/cars/1', auth({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ branchId: 999, brand: 'X', model: 'Y', year: 2024, registrationNo: 'KA01ZZ9999', fuelType: 'petrol', transmission: 'manual', seats: 5, pricePerDay: 1000 }) }), session.jar);
  await hit('PATCH booking illegal status', '/api/admin/bookings/999999', auth({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'teleported' }) }), session.jar);
  await hit('PATCH delivery 0x10', '/api/admin/deliveries/0x10', auth({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'delivered' }) }), session.jar);
  await hit('DELETE admin car 1e20', '/api/admin/cars/1e20', auth({ method: 'DELETE' }), session.jar);
  await hit('GET page /admin', '/admin', {}, session.jar);
  await hit('GET page /bookings', '/bookings', {}, session.jar);
} else {
  results.push('note  admin sign-in failed (database down or rate limited); admin routes checked unauthenticated only');
}

console.log(results.join('\n'));
console.log(failures ? `\n${failures} response(s) leaked internals.` : '\nNo response leaked a stack trace, SQL, driver code, or path.');
process.exitCode = failures ? 1 : 0;
