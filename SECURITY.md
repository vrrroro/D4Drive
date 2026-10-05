# Security

## Reporting

Do not open a public issue for a vulnerability. Report it privately through the
repository's Security tab, under "Report a vulnerability".

If a credential is ever committed: **rotate it first, clean history second.**
Rewriting history does not un-leak a secret that has already been pushed. Assume
anything pushed to a remote is compromised permanently.

---

## Threat model

This is an academic project, but it handles passwords, addresses, booking
records, and simulated payments. The controls below are treated as requirements,
not as extra credit.

| Threat | Control |
|---|---|
| SQL injection | Parameterised queries only. No string concatenation into SQL, ever. |
| Credential stuffing and brute force | Rate limiting on auth routes, Argon2id hashing |
| Session theft via XSS | `httpOnly` cookies. Client JavaScript cannot read the session. |
| CSRF | `SameSite=Lax` plus a double-submit token on state-changing requests |
| Broken access control | Server-side `requireSession` and `requireAdmin` on every protected route |
| Insecure direct object reference | Ownership checked on every booking and invoice fetch |
| Information disclosure | Generic error responses. Detail is logged server-side only. |
| Double booking | Row lock held across the availability check and the insert |
| Injected markup | React escapes by default. `dangerouslySetInnerHTML` is banned. |
| Supply chain | `npm audit` in CI, lockfile committed, dependencies kept minimal |

---

## Rules

**Parameterised SQL, no exceptions.** Not for integers, not for admin-only
routes, not temporarily during debugging. A query built with a template literal
fails review even when the input looks safe.

```ts
// Correct
await pool.execute('SELECT * FROM cars WHERE brand = ? AND seats = ?', [brand, seats]);

// Banned
await pool.query(`SELECT * FROM cars WHERE brand = '${brand}'`);
```

Dynamic filters build a parameter array alongside the clause list. They never
interpolate a value.

**Sessions live in cookies, never in `localStorage`.** `httpOnly`, `Secure`,
`SameSite=Lax`, scoped path. If client JavaScript can read the token, a single
XSS anywhere on the page becomes a full account takeover.

**Access tokens are short-lived** (15 minutes) with a rotating refresh token
(7 days). Each refresh token's `jti` is recorded in `refresh_tokens`;
`POST /api/auth/refresh` retires the presented token and issues a new pair. A
retired token presented again (outside a 10 second window that absorbs two tabs
refreshing at once) is treated as theft and revokes every live token for that
user. Logout revokes the current token server-side. The refresh cookie is
scoped to `/api/auth`, so it travels only to refresh and logout.

**Post-login redirects are same-origin only.** `?next=` is validated by
`lib/safe-redirect.ts`; absolute and protocol-relative URLs fall back to `/cars`.

**Authorisation is checked server-side, every time.** Hiding an admin link in the
UI is not access control. Every admin route re-verifies the role from the session
on the server. Every booking and invoice fetch verifies that the requesting user
owns the record, or is an admin.

**Validate at the boundary.** Every route handler parses its input with a zod
schema before anything else runs. Unvalidated data never reaches a service or a
query.

**Errors do not leak.** Log the full error server-side. Return a generic message
and the correct status code. Stack traces, SQL fragments, and column names never
cross the wire. This is enforced in the shared error handler, not per route.

**Never log a secret.** No passwords, no tokens, no full card numbers, not even
at debug level. Logs get copied into issues and screenshots.

**Passwords use Argon2id**, not bcrypt, and never MD5 or SHA. Minimum 12
characters, checked server-side. No maximum length below 128, and no character
class requirements, which push users toward predictable patterns.

---

## Payment simulation

Card and UPI payment in this project is **simulated**. It is not a real gateway
and it is not PCI compliant.

- Never store a card number, CVV, or expiry, not even a fake one, in the database
- The payments table records status, amount, method, and a mock reference only
- Payment UI is visibly labelled as a simulation
- Do not add a real gateway without changing this document first

---

## Content Security Policy

The intro sequence needs an explicitly authored CSP, because the video and the
grain layer both need permissions a default policy would deny.

```
default-src 'self';
media-src 'self';
img-src 'self' data: blob:;
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`style-src 'unsafe-inline'` is present because Next.js injects inline styles.
Narrow it to a nonce before any real deployment. `frame-ancestors 'none'`
prevents clickjacking of the auth gate, which is the highest-value target on the
page.
