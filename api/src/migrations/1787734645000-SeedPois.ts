import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The predefined points of interest the app discovers by proximity.
 *
 * Reference data rather than developer fixtures — the feature is empty without
 * it — so it ships as a migration and runs in every environment. It replaces
 * the former container initialization seed script. No users, groups,
 * memberships or discoveries are seeded: those are user-generated.
 *
 * That former script did run on the production volume, which already holds
 * these four rows, so the insert skips titles that are present rather than
 * duplicating them — `pois.title` carries no unique constraint to lean on.
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
      SELECT seed.title, seed.description, seed.location, seed.image_url
      FROM (
          VALUES
              (
                  'Eiffel Tower',
                  'Landmark in Paris, France.',
                  ST_SetSRID(ST_MakePoint(2.2945, 48.8584), 4326),
                  NULL::text
              ),
              (
                  'Parthenon',
                  'Ancient temple on the Acropolis of Athens, Greece.',
                  ST_SetSRID(ST_MakePoint(23.7267, 37.9715), 4326),
                  NULL::text
              ),
              (
                  'Mont Blanc',
                  'Highest mountain in the Alps.',
                  ST_SetSRID(ST_MakePoint(6.8652, 45.8326), 4326),
                  NULL::text
              ),
              (
                  'Alhambra',
                  'Historic palace and fortress complex in Granada, Spain.',
                  ST_SetSRID(ST_MakePoint(-3.5881, 37.1761), 4326),
                  NULL::text
              )
      ) AS seed (title, description, location, image_url)
      WHERE NOT EXISTS (
          SELECT 1 FROM pois existing WHERE existing.title = seed.title
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pois WHERE title = ANY($1)`, [
      SeedPois1787734645000.TITLES,
    ]);
  }
}
