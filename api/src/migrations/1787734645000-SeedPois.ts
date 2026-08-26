import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The predefined points of interest the app discovers by proximity.
 *
 * Reference data rather than developer fixtures — the feature is empty without
 * it — so it ships as a migration and runs in every environment. Carried over
 * from the former `infra/postgres/init/008_seed_data.sql`. No users, groups,
 * memberships or discoveries are seeded: those are user-generated.
 *
 * Coordinates are stored as POINT(longitude, latitude).
 */
export class SeedPois1787734645000 implements MigrationInterface {
  name = 'SeedPois1787734645000';

  private static readonly TITLES = [
    'Eiffel Tower',
    'Parthenon',
    'Mont Blanc',
    'Alhambra',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO pois (title, description, location, image_url)
      VALUES
          (
              'Eiffel Tower',
              'Landmark in Paris, France.',
              ST_SetSRID(ST_MakePoint(2.2945, 48.8584), 4326),
              NULL
          ),
          (
              'Parthenon',
              'Ancient temple on the Acropolis of Athens, Greece.',
              ST_SetSRID(ST_MakePoint(23.7267, 37.9715), 4326),
              NULL
          ),
          (
              'Mont Blanc',
              'Highest mountain in the Alps.',
              ST_SetSRID(ST_MakePoint(6.8652, 45.8326), 4326),
              NULL
          ),
          (
              'Alhambra',
              'Historic palace and fortress complex in Granada, Spain.',
              ST_SetSRID(ST_MakePoint(-3.5881, 37.1761), 4326),
              NULL
          )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pois WHERE title = ANY($1)`, [
      SeedPois1787734645000.TITLES,
    ]);
  }
}
