import { randomInt } from 'node:crypto';

/**
 * The group invitation code (FR-26).
 *
 * A group carries exactly one, permanently: there is no invitation table, no
 * expiry and no per-invite token. The owner reads the code off the group
 * screen and sends it however they like; a recipient types it into
 * POST /api/groups/join. That is the whole mechanism, and it is deliberately
 * the simplest one that satisfies "invite other users using an invitation code
 * or link" for the MVP.
 */

/**
 * Upper-case letters and digits minus every lookalike: no I, L, O or U, no 0
 * or 1. A code is meant to be read off someone else's screen and typed by
 * hand, and "was that an O or a zero?" is the failure mode that costs a user
 * the whole flow.
 */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

/** 30^8 ~= 6.6e11 codes — far beyond what anyone could enumerate through the API. */
export const INVITE_CODE_LENGTH = 8;

/**
 * Width of groups.invite_code. Wider than INVITE_CODE_LENGTH on purpose, so
 * lengthening a code later is a migration of the data rather than of the
 * column.
 */
export const INVITE_CODE_MAX_LENGTH = 12;

/**
 * A fresh code.
 *
 * randomInt() rather than Math.random(): the code is the only thing standing
 * between a stranger and a group's shared map (NFR-19), so it has to come from
 * a CSPRNG. randomInt() also rejects modulo bias internally, which a
 * `randomBytes()[i] % alphabet.length` would not.
 */
export function generateInviteCode(): string {
  let code = '';

  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }

  return code;
}

/**
 * The code as it is stored and looked up.
 *
 * People paste codes with the grouping they were shown ("AB3K-9QZ2"), with a
 * stray space, or in whatever case their keyboard happened to be in.
 * Normalising means the lookup compares what the user meant rather than what
 * they typed — the same job normalizeEmail() does in auth.service.ts, and done
 * in the service for the same reason: so the write path and the read path
 * cannot diverge.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}
