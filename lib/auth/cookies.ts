import { cookies } from 'next/headers';
import { signToken, verifyToken, type SessionClaims } from './tokens';
import { recordRefreshToken } from './refresh-store';

/**
 * Session cookies.
 *
 * `httpOnly` is the whole point. If client JavaScript can read the session
 * token, one XSS anywhere on the page becomes a full account takeover. That is
 * why these are cookies and not `localStorage`, and why nothing in this file
 * ever returns a raw token to a caller that might render it.
 */

export const ACCESS_COOKIE = 'd4d_at';
export const REFRESH_COOKIE = 'd4d_rt';
export const CSRF_COOKIE = 'd4d_csrf';

const isProduction = process.env.NODE_ENV === 'production';

const baseOptions = {
  httpOnly: true,
  // Secure is dropped in development because localhost is plain HTTP and the
  // browser silently discards Secure cookies there. It is always on in prod.
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

const ACCESS_MAX_AGE = 60 * 15;
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Scoped to `/api/auth` so it is not sent on every request. A token that
 * travels less is a token with fewer chances to leak. It covers refresh,
 * which rotates it, and logout, which revokes it.
 */
const REFRESH_PATH = '/api/auth';

/** The path used before logout needed the cookie too. Cleared on sign out. */
const LEGACY_REFRESH_PATH = '/api/auth/refresh';

/** A jti and expiry for the next refresh token, minted before it is recorded. */
export function nextRefreshIdentity(): { jti: string; expiresAt: Date } {
  return {
    jti: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE * 1000),
  };
}

/**
 * Signs a fresh token pair and writes all three cookies.
 *
 * The caller has already recorded `refreshJti` server-side. Returns the new
 * CSRF token.
 */
export async function writeSessionCookies(
  userId: number,
  role: 'customer' | 'admin',
  refreshJti: string,
): Promise<string> {
  const store = await cookies();

  const [accessToken, refreshToken] = await Promise.all([
    signToken(userId, role, 'access'),
    signToken(userId, role, 'refresh', refreshJti),
  ]);

  store.set(ACCESS_COOKIE, accessToken, { ...baseOptions, maxAge: ACCESS_MAX_AGE });
  store.set(REFRESH_COOKIE, refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_MAX_AGE,
    path: REFRESH_PATH,
  });

  // The CSRF token is deliberately NOT httpOnly. The double-submit pattern
  // requires client JavaScript to read it and echo it in a header, which an
  // attacker on a different origin cannot do.
  const csrfToken = crypto.randomUUID();
  store.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });

  return csrfToken;
}

/** Starts a new session: records the refresh token, then sets the cookies. */
export async function setSessionCookies(
  userId: number,
  role: 'customer' | 'admin',
): Promise<string> {
  const { jti, expiresAt } = nextRefreshIdentity();
  await recordRefreshToken(jti, userId, expiresAt);
  return writeSessionCookies(userId, role, jti);
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete({ name: REFRESH_COOKIE, path: REFRESH_PATH });
  store.delete({ name: REFRESH_COOKIE, path: LEGACY_REFRESH_PATH });
  store.delete(CSRF_COOKIE);
}

/** Reads and verifies the current access token. Returns null when absent. */
export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token, 'access');
}

export async function readRefreshToken(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(REFRESH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token, 'refresh');
}
