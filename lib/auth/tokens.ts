import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Session tokens.
 *
 * `jose` rather than `jsonwebtoken`, because Next middleware runs on the Edge
 * runtime where `jsonwebtoken`'s Node crypto dependencies are unavailable.
 * Using two different JWT libraries for middleware and route handlers would be
 * worse than using the one that works in both.
 */

export type TokenType = 'access' | 'refresh';

export interface SessionClaims extends JWTPayload {
  sub: string;
  role: 'customer' | 'admin';
  type: TokenType;
}

const ISSUER = 'd4drive';
const AUDIENCE = 'd4drive:web';

function secretFor(type: TokenType): Uint8Array {
  const name = type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} is missing or too short. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }

  return new TextEncoder().encode(value);
}

export const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
export const REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';

export async function signToken(
  userId: number,
  role: 'customer' | 'admin',
  type: TokenType,
): Promise<string> {
  return new SignJWT({ role, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(type === 'access' ? ACCESS_TTL : REFRESH_TTL)
    .sign(secretFor(type));
}

/**
 * Verifies a token and confirms it is the type the caller expected.
 *
 * The `type` check matters. Without it, a long-lived refresh token would be
 * accepted anywhere an access token is, defeating the entire point of the
 * short access lifetime.
 */
export async function verifyToken(
  token: string,
  expected: TokenType,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretFor(expected), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (payload.type !== expected) return null;
    if (typeof payload.sub !== 'string') return null;
    if (payload.role !== 'customer' && payload.role !== 'admin') return null;

    return payload as SessionClaims;
  } catch {
    // Expired, tampered, wrong signature, malformed. All of them mean "no
    // session", and none of them should tell the caller which.
    return null;
  }
}
