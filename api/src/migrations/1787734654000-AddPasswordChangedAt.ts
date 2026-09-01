import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a password change end every other session.
 *
 * ADR-009 chose a stateless token and accepted that changing a password does
 * not invalidate the ones already issued — for up to seven days, "I think I
 * was compromised, let me change my password" accomplished nothing. Comparing
 * the token's own `iat` against this column closes that without a revocation
 * list: no new claim, one indexed primary-key lookup in JwtAuthGuard.
 *
 * `users.updated_at` could not be reused. It moves on every profile edit too,
 * so it would log the user out of every device each time they renamed
 * themselves.
 *
 * Nullable, with no default: NOW() here would invalidate every outstanding
 * token the moment this deploys. NULL means "never changed since this
 * migration ran", which the guard reads as "nothing to compare against".
 */
export class AddPasswordChangedAt1787734654000 implements MigrationInterface {
  name = 'AddPasswordChangedAt1787734654000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
          ADD COLUMN password_changed_at TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
          DROP COLUMN IF EXISTS password_changed_at
    `);
  }
}
