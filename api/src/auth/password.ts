import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP ASVS 4.0 §2.1.1 (at least 12 characters) and §2.1.2 (accept long
 * ones). There is deliberately no composition rule — §2.1.9 argues against
 * requiring upper/lower/digit/symbol, because forcing classes pushes people
 * towards `Password1!` while length is what actually resists guessing.
 *
 * The ceiling is a cost bound, not a policy statement: argon2 hashes whatever
 * it is given, and an unbounded body would let one request burn arbitrary CPU.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * OWASP Password Storage Cheat Sheet, argon2id row: 19 MiB of memory, 2
 * iterations, 1 degree of parallelism.
 *
 * `algorithm` is deliberately not passed. argon2id is @node-rs/argon2's
 * default, and its `Algorithm` export is an *ambient const enum*, which
 * `isolatedModules` (on in tsconfig.json) forbids reading a member of.
 * password.spec.ts asserts the digest starts with
 * `$argon2id$v=19$m=19456,t=2,p=1$`, so the default cannot change under us
 * without a red test.
 */
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

/** Produces the PHC string stored in users.password_hash. */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Checks a candidate password against a stored hash.
 *
 * Returns `false` rather than throwing when the stored value is not a PHC
 * string argon2 can parse: a corrupt row must fail the login, not turn it into
 * a 500 that tells the caller something unusual happened to that account.
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    // No options here on purpose: the cost parameters come from the stored
    // hash itself, which is what lets ARGON2_OPTIONS be raised later without
    // invalidating every existing password.
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
