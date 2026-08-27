import type { MigrationInterface, QueryRunner } from 'typeorm';
import { POI_CATALOG } from '../pois/poi.catalog';

/** Replaces the four prototype rows with one predefined POI per MVP country. */
export class ReplaceMvpPois1787734648000 implements MigrationInterface {
  name = 'ReplaceMvpPois1787734648000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (POI_CATALOG.length !== 195) {
      throw new Error(`The MVP POI catalogue must contain exactly 195 rows.`);
    }

    await queryRunner.query(`DELETE FROM pois`);
    await queryRunner.query(
      `
        INSERT INTO pois (title, description, location, image_url)
        SELECT
          item.title,
          item.description,
          ST_SetSRID(ST_MakePoint(item.longitude, item.latitude), 4326),
          item.image_url
        FROM jsonb_to_recordset($1::jsonb) AS item(
          title text,
          description text,
          longitude double precision,
          latitude double precision,
          image_url text
        )
      `,
      [
        JSON.stringify(
          POI_CATALOG.map((poi) => ({
            title: poi.title,
            description: poi.description,
            longitude: poi.longitude,
            latitude: poi.latitude,
            image_url: poi.imageUrl,
          })),
        ),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pois`);
    await queryRunner.query(`
      INSERT INTO pois (title, description, location, image_url)
      VALUES
        ('Eiffel Tower', 'Landmark in Paris, France.', ST_SetSRID(ST_MakePoint(2.2945, 48.8584), 4326), NULL),
        ('Parthenon', 'Ancient temple on the Acropolis of Athens, Greece.', ST_SetSRID(ST_MakePoint(23.7267, 37.9715), 4326), NULL),
        ('Mont Blanc', 'Highest mountain in the Alps.', ST_SetSRID(ST_MakePoint(6.8652, 45.8326), 4326), NULL),
        ('Alhambra', 'Historic palace and fortress complex in Granada, Spain.', ST_SetSRID(ST_MakePoint(-3.5881, 37.1761), 4326), NULL)
    `);
  }
}
