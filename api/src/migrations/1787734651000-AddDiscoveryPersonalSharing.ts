import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Lets a discovery remain on the personal map while also being shared. */
export class AddDiscoveryPersonalSharing1787734651000 implements MigrationInterface {
  name = 'AddDiscoveryPersonalSharing1787734651000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
      ADD COLUMN is_personal BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await queryRunner.query(`
      UPDATE discoveries
      SET is_personal = TRUE
      WHERE group_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
      DROP COLUMN is_personal
    `);
  }
}
