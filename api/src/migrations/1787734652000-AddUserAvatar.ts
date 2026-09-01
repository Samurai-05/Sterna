import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every account an optional profile photo.
 *
 * Nullable and unconstrained beyond its length, unlike groups.invite_code:
 * most accounts will never set one, there is nothing to backfill, and the key
 * itself is only ever produced by PhotosService.store() (ADR-006), so there is
 * no format to enforce here.
 */
export class AddUserAvatar1787734652000 implements MigrationInterface {
  name = 'AddUserAvatar1787734652000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
          ADD COLUMN avatar_object_key VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
          DROP COLUMN IF EXISTS avatar_object_key
    `);
  }
}
