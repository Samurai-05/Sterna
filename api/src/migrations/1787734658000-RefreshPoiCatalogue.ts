import type { MigrationInterface, QueryRunner } from 'typeorm';
import { POI_CATALOG } from '../pois/poi.catalog';

const CATALOG_REVISION = 1;
const SAME_POI_TOLERANCE_METERS = 1;

/**
 * Synchronizes the expanded catalogue without deleting existing POI rows.
 * Keeping retired rows protects discoveries.confirmed_poi_id references;
 * application queries expose only the current active catalogue.
 */
export class RefreshPoiCatalogue1787734658000 implements MigrationInterface {
  name = 'RefreshPoiCatalogue1787734658000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pois
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN catalog_revision INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TEMPORARY TABLE refreshed_poi_catalogue (
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        location geometry(Point, 4326) NOT NULL,
        image_url TEXT NOT NULL
      ) ON COMMIT DROP
    `);

    await queryRunner.query(
      `
        INSERT INTO refreshed_poi_catalogue (
          title,
          description,
          location,
          image_url
        )
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

    await queryRunner.query(`UPDATE pois SET is_active = FALSE`);

    await queryRunner.query(`
      UPDATE pois poi
      SET
        description = catalogue.description,
        image_url = catalogue.image_url,
        is_active = TRUE
      FROM refreshed_poi_catalogue catalogue
      WHERE poi.title = catalogue.title
        AND ST_DWithin(
          poi.location::geography,
          catalogue.location::geography,
          ${SAME_POI_TOLERANCE_METERS}
        )
    `);

    await queryRunner.query(
      `
        INSERT INTO pois (
          title,
          description,
          location,
          image_url,
          is_active,
          catalog_revision
        )
        SELECT
          catalogue.title,
          catalogue.description,
          catalogue.location,
          catalogue.image_url,
          TRUE,
          $1
        FROM refreshed_poi_catalogue catalogue
        WHERE NOT EXISTS (
          SELECT 1
          FROM pois poi
          WHERE poi.is_active
            AND poi.title = catalogue.title
            AND ST_DWithin(
              poi.location::geography,
              catalogue.location::geography,
              ${SAME_POI_TOLERANCE_METERS}
            )
        )
      `,
      [CATALOG_REVISION],
    );

    const [result] = (await queryRunner.query(`
        SELECT COUNT(*)::text AS count
        FROM pois
        WHERE is_active
      `)) as { count: string }[];
    const activeCount = Number(result?.count);

    if (activeCount !== POI_CATALOG.length) {
      throw new Error(
        `Expected ${POI_CATALOG.length} active POIs after refresh, received ${activeCount}.`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM pois WHERE catalog_revision = $1`, [
      CATALOG_REVISION,
    ]);
    await queryRunner.query(`UPDATE pois SET is_active = TRUE`);
    await queryRunner.query(`
      ALTER TABLE pois
        DROP COLUMN catalog_revision,
        DROP COLUMN is_active
    `);
  }
}
