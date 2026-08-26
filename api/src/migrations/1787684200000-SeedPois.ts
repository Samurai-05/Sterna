import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPois1787684200000 implements MigrationInterface {
  name = 'SeedPois1787684200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO pois (title, description, location, image_url)
      SELECT *
      FROM (
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
      ) AS seed(title, description, location, image_url)
      WHERE NOT EXISTS (
          SELECT 1 FROM pois WHERE pois.title = seed.title
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM pois
      WHERE title IN ('Eiffel Tower', 'Parthenon', 'Mont Blanc', 'Alhambra')
    `);
  }
}
