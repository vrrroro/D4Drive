import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession } from './cookies';
import { CSRF_COOKIE } from './cookies';
import type { SessionClaims } from './tokens';
import { mapDbError, dbErrno } from '@/lib/services/db-errors';

export interface Session {
  userId: number;
  role: 'customer' | 'admin';
}

/**
 * Standard error responses.
 *
 * Every failure path returns a generic message. Detail is logged server-side
 * and never crosses the wire, because a specific error tells an attacker
 * which of their guesses was closer.
 */
export const errors = {
  unauthorised: () =>
    NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
  forbidden: () =>
    NextResponse.json({ error: 'You do not have access to this resource.' }, { status: 403 }),
  badRequest: (message = 'Invalid request.') =>
    NextResponse.json({ error: message }, { status: 400 }),
  notFound: (message = 'Not found.') =>
    NextResponse.json({ error: message }, { status: 404 }),
  conflict: (message = 'That conflicts with an existing record.') =>
    NextResponse.json({ error: message }, { status: 409 }),
  tooMany: (retryAfterSeconds: number) =>
    NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    ),
  server: () =>
    NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 }),
};

function toSession(claims: SessionClaims): Session {
  return { userId: Number(claims.sub), role: claims.role };
}

/** Returns the session, or null. For routes where auth is optional. */
export async function getSession(): Promise<Session | null> {
  const claims = await readSession();
  return claims ? toSession(claims) : null;
}

/**
 * Returns the session or a 401 response.
 *
 * Callers must check `'error' in result` before using it. The union return is
 * deliberate: it makes forgetting the check a type error rather than a silent
 * authorisation bypass.
 */
export async function requireSession(): Promise<
  { session: Session } | { error: NextResponse }
> {
  const claims = await readSession();
  if (!claims) return { error: errors.unauthorised() };
  return { session: toSession(claims) };
}

/** Same, plus an admin role check. */
export async function requireAdmin(): Promise<
  { session: Session } | { error: NextResponse }
> {
  const result = await requireSession();
  if ('error' in result) return result;
  if (result.session.role !== 'admin') return { error: errors.forbidden() };
  return result;
}

/**
 * Double-submit CSRF check.
 *
 * `SameSite=Lax` alone does not cover a top-level POST, so this is required
 * rather than belt-and-braces. The cookie is readable by same-origin script,
 * which echoes it in the header. A cross-origin attacker can cause the cookie
 * to be sent but cannot read it to set the header.
 */
export async function verifyCsrf(request: Request): Promise<boolean> {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  // Constant-time comparison. A plain === leaks match length through timing.
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i += 1) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Turns a thrown error into a response.
 *
 * A refusal from the database (a stored program's SIGNAL, a foreign key or
 * CHECK constraint) is the caller asking for something impossible, so it
 * becomes a 4xx with a safe message (lib/services/db-errors.ts). Anything
 * else is logged server-side in full and answered with a generic 500.
 */
export function handleRouteError(context: string, error: unknown): NextResponse {
  const mapped = mapDbError(error);
  if (mapped) {
    // Constraint hits that are not our own SIGNALs can mean a validation gap
    // in the app, so they are worth seeing in the log.
    if ((dbErrno(error) ?? 0) < 5000) console.warn(`[${context}]`, mapped.message, dbErrno(error));
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
  console.error(`[${context}]`, error);
  return errors.server();
}
