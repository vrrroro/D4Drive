import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id.
 *
 * The library exports `Algorithm` as an ambient const enum, which `tsc` cannot
 * read under `isolatedModules`. The numeric value is part of the Argon2 spec
 * (0 = Argon2d, 1 = Argon2i, 2 = Argon2id), so pinning it here is stable.
 */
const ARGON2ID = 2;

/**
 * Password hashing.
 *
 * Argon2id rather than bcrypt: it is memory-hard, so a GPU or ASIC attacker
 * gains far less advantage per unit of cost than they do against bcrypt's
 * relatively small memory footprint. `@node-rs/argon2` ships prebuilt binaries
 * for win32-x64, so there is no compiler toolchain requirement.
 *
 * Parameters follow the OWASP Password Storage Cheat Sheet's Argon2id
 * recommendation: 19 MiB memory, 2 iterations, 1 degree of parallelism.
 */
const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * A valid encoded hash of a throwaway value.
 *
 * Used to burn equivalent CPU when a login is attempted against an email that
 * does not exist. Without it, a missing user returns in microseconds while a
 * real one takes ~50ms, and that difference is a reliable account-enumeration
 * oracle even when the error message is identical.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$Zm9yY29uc3RhbnR0aW1lY29tcGFyaXNvbg';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(
  encodedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(encodedHash, password, OPTIONS);
  } catch {
    // A malformed stored hash must fail closed, not throw a 500 that tells the
    // caller something unusual happened for this particular account.
    return false;
  }
}

/**
 * Burns comparable CPU for a nonexistent account.
 *
 * Always returns false. The point is the elapsed time, not the result.
 */
export async function fakeVerify(password: string): Promise<false> {
  await verifyPassword(DUMMY_HASH, password);
  return false;
}
