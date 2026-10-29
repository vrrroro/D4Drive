import { readCsrfToken } from '@/lib/csrf';

/**
 * Client-side fetch for authenticated API calls.
 *
 * The access token lives for 15 minutes. When a call comes back 401, this
 * asks `/api/auth/refresh` for a new pair and retries the original request
 * exactly once. A second 401 is returned to the caller as-is, so a session
 * that is genuinely over surfaces as "sign in again" rather than a loop.
 *
 * The CSRF header is read fresh on every attempt, because a refresh rotates
 * the CSRF cookie along with the tokens.
 */

let inFlight: Promise<boolean> | null = null;

/**
 * One refresh at a time per tab. Three calls failing together must not race
 * three rotations of the same refresh token, or the second and third would
 * look like a replayed token to the server.
 */
export function refreshSession(): Promise<boolean> {
  inFlight ??= fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    headers.set('x-csrf-token', readCsrfToken());
    return fetch(input, { ...init, headers, credentials: 'same-origin' });
  };

  const response = await send();
  if (response.status !== 401) return response;

  const refreshed = await refreshSession();
  return refreshed ? send() : response;
}
