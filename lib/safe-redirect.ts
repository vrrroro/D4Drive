/**
 * Validates a post-login redirect target.
 *
 * `?next=` is attacker-controlled. Passing it straight to the router turns
 * the sign-in page into an open redirect: a link to
 * `/login?next=https://evil.example` signs the victim in and then hands them
 * to a lookalike page. Only same-origin paths are accepted.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/cars'): string {
  if (!raw) return fallback;
  // Must be a path. `//host` and `/\host` are protocol-relative in browsers.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  // Control characters can smuggle a scheme past naive checks.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
