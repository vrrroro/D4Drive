/**
 * Rate limiting.
 *
 * In-memory fixed-window counter. This is correct for a single-instance
 * academic deployment and explicitly wrong for a horizontally scaled one,
 * where each instance would keep its own counts and the effective limit would
 * multiply by the instance count. Swap the store for Redis before scaling out.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Sweeps expired buckets so the map does not grow without bound under a
 * distributed attack that uses a fresh key each time.
 */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: max - existing.count, retryAfterSeconds: 0 };
}

/**
 * Best-effort client address.
 *
 * Behind a proxy this reads a forwarded header, which a client can spoof when
 * the app is exposed directly. That is acceptable for a limiter (the worst
 * case is an attacker rate-limiting themselves less effectively) and would not
 * be acceptable for anything authorisation-related.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000);
const AUTH_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 8);

/**
 * Limits auth attempts by IP and by target account independently.
 *
 * Limiting by IP alone lets a botnet spread attempts across addresses.
 * Limiting by account alone lets an attacker lock a known user out of their
 * own account from a single machine. Both, checked together, cover each
 * other's gap: the account limit is deliberately looser so a real user
 * fat-fingering their password is not punished.
 */
export function limitAuthAttempt(request: Request, accountKey: string): RateLimitResult {
  const byIp = rateLimit(`auth:ip:${clientKey(request)}`, AUTH_MAX, WINDOW_MS);
  if (!byIp.allowed) return byIp;

  return rateLimit(`auth:acct:${accountKey.toLowerCase()}`, AUTH_MAX * 3, WINDOW_MS);
}
