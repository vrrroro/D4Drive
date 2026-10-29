/**
 * Reads the double-submit CSRF token.
 *
 * This cookie is deliberately not httpOnly: the pattern requires same-origin
 * script to read it and echo it in a header. A cross-origin attacker can cause
 * the cookie to be sent with a forged request but cannot read it to set the
 * matching header, which is what makes the pair meaningful.
 */
export function readCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)d4d_csrf=([^;]+)/);
  return match?.[1] ?? '';
}
