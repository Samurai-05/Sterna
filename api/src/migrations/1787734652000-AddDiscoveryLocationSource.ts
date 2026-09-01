import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Records the provenance of the coordinates saved on a discovery. */
export class AddDiscoveryLocationSource1787734652000 implements MigrationInterface {
  name = 'AddDiscoveryLocationSource1787734652000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
      ADD COLUMN location_source VARCHAR(20) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE discoveries
      ADD CONSTRAINT discoveries_location_source_check
      CHECK (location_source IS NULL OR location_source IN ('exif', 'current_gps', 'manual'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
      DROP CONSTRAINT discoveries_location_source_check
    `);
    await queryRunner.query(`
      ALTER TABLE discoveries
      DROP COLUMN location_source
    `);
  }
}
