import { randomInt } from 'node:crypto';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every group a permanent invitation code (FR-26).
 *
 * The baseline schema modelled groups and memberships but nothing a user could
 * be invited *with*, so joining a group was unreachable: ids are sequential
 * BIGINTs, and letting anyone join by id would make every group reachable by
 * guesswork — the exact opposite of NFR-19.
 *
 * One column rather than an invitations table, deliberately. The MVP needs a
 * code the owner can copy off the group screen and a stranger can type in; it
 * needs neither expiry nor per-recipient tracking, and a table would have to
 * answer questions ("who invited whom, when does it lapse") the product does
 * not ask.
 *
 * Ordering below is load-bearing: UNIQUE tolerates multiple NULLs, so adding
 * the constraint *before* the backfill lets the backfill lean on it to detect
 * a collision, and SET NOT NULL comes last, once every row has a value.
 */
export class AddGroupInviteCode1787734647000 implements MigrationInterface {
  name = 'AddGroupInviteCode1787734647000';

  /** Postgres unique_violation. */
  private static readonly UNIQUE_VIOLATION = '23505';

  /** Give up rather than spin, if something is badly wrong with the RNG. */
  private static readonly MAX_ATTEMPTS = 10;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE groups
          ADD COLUMN invite_code VARCHAR(12)
    `);

    // Named the way Postgres itself names an inline UNIQUE, matching
    // users_email_key behind User.email — otherwise the entity's `unique: true`
    // and the database disagree and every migration:generate emits a diff.
    await queryRunner.query(`
      ALTER TABLE groups
          ADD CONSTRAINT groups_invite_code_key UNIQUE (invite_code)
    `);

    await AddGroupInviteCode1787734647000.backfill(queryRunner);

    await queryRunner.query(`
      ALTER TABLE groups
          ALTER COLUMN invite_code SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE groups
          ADD CONSTRAINT groups_invite_code_not_blank
          CHECK (BTRIM(invite_code) <> '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE groups
          DROP CONSTRAINT IF EXISTS groups_invite_code_not_blank
    `);

    await queryRunner.query(`
      ALTER TABLE groups
          DROP CONSTRAINT IF EXISTS groups_invite_code_key
    `);

    await queryRunner.query(`
      ALTER TABLE groups
          DROP COLUMN IF EXISTS invite_code
    `);
  }

  /**
   * Gives the rows that predate the column a code each.
   *
   * Every current environment has an empty `groups` table — nothing could
   * create a group before this feature existed — so in practice this loop does
   * nothing. It is here because "in practice" is not "by construction", and a
   * SET NOT NULL that aborts on a stray row would take the whole deploy with
   * it.
   */
  private static async backfill(queryRunner: QueryRunner): Promise<void> {
    // QueryRunner.query() is untyped, unlike Repository.query().
    const rows = (await queryRunner.query(
      `SELECT id FROM groups WHERE invite_code IS NULL`,
    )) as { id: string }[];

    for (const row of rows) {
      await AddGroupInviteCode1787734647000.assignCode(queryRunner, row.id);
    }
  }

  private static async assignCode(
    queryRunner: QueryRunner,
    id: string,
  ): Promise<void> {
    for (
      let attempt = 1;
      attempt <= AddGroupInviteCode1787734647000.MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        await queryRunner.query(
          `UPDATE groups SET invite_code = $1 WHERE id = $2`,
          [AddGroupInviteCode1787734647000.code(), id],
        );

        return;
      } catch (error) {
        const code = (error as { code?: unknown }).code;

        if (code !== AddGroupInviteCode1787734647000.UNIQUE_VIOLATION) {
          throw error;
        }
      }
    }

    throw new Error(
      `Could not find a free invitation code for group ${id} in ` +
        `${AddGroupInviteCode1787734647000.MAX_ATTEMPTS} attempts.`,
    );
  }

  /**
   * A copy of generateInviteCode() from src/groups/invite-code.ts rather than
   * an import of it.
   *
   * A migration is a record of what ran, and importing application code makes
   * that record change every time the application does. The duplication is
   * eight lines and will never need to be kept in sync: this runs once, on
   * rows that do not exist.
   */
  private static code(): string {
    const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
    let code = '';

    for (let i = 0; i < 8; i += 1) {
      code += alphabet[randomInt(alphabet.length)];
    }

    return code;
  }
}
