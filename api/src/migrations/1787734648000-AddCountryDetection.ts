import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

interface CountryFeature {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  properties: { A3?: string };
}

interface CountryFeatureCollection {
  type: 'FeatureCollection';
  features: CountryFeature[];
}

/**
 * Real country detection for discoveries (issue #59 / ADR-005), replacing the
 * frontend-only heuristic that used to look coordinates up against
 * `countries.geo.json` with plain point-in-polygon math in the browser.
 *
 * That heuristic missed constantly near coastlines: `countries.geo.json` is a
 * simplified ~1.5MB boundary dataset (221 features), so a point can sit
 * clearly on land in the detailed map tiles while falling just outside the
 * simplified polygon — a discovery pinned metres from the Sardinian coast
 * matched no country at all and left Italy permanently marked unexplored.
 *
 * This migration brings the *same* dataset into PostGIS as a `countries`
 * table (ADR-005 leaves the dataset/schema choice open, and reusing it avoids
 * a second boundary source to keep in sync with the map's own veil layer,
 * which still renders `countries.geo.json` directly). The coastline
 * imprecision is inherent to the dataset, not the point-in-polygon algorithm,
 * so `DiscoveriesService` — see COUNTRY_MATCH_BUFFER_METERS there — falls
 * back to the nearest country within a small buffer when no polygon actually
 * contains the point, rather than just swapping the JS ray-casting for
 * PostGIS's ST_Contains and keeping the same blind spot.
 */
export class AddCountryDetection1787734648000 implements MigrationInterface {
  name = 'AddCountryDetection1787734648000';

  /**
   * Metres a point may sit outside every country polygon and still count.
   *
   * Duplicated from DiscoveriesService.COUNTRY_MATCH_BUFFER_METERS rather
   * than imported — see AddGroupInviteCode1787734647000 for why a migration
   * does not import application code. Keep the two literals in sync.
   */
  private static readonly BUFFER_METERS = 5000;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE countries (
          a3 CHAR(3) PRIMARY KEY,
          geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_countries_geom ON countries USING GIST (geom)
    `);

    await AddCountryDetection1787734648000.seedCountries(queryRunner);

    await queryRunner.query(`
      ALTER TABLE discoveries
          ADD COLUMN country_code CHAR(3) NULL
          REFERENCES countries (a3) ON DELETE SET NULL
    `);

    // Rows created before this migration never had a country computed.
    await queryRunner.query(
      `
      UPDATE discoveries d
      SET country_code = (
          SELECT c.a3
          FROM countries c
          WHERE ST_Contains(c.geom, d.location)
             OR ST_DWithin(
                  c.geom::geography,
                  d.location::geography,
                  $1
                )
          ORDER BY
              ST_Contains(c.geom, d.location) DESC,
              c.geom <-> d.location
          LIMIT 1
      )
    `,
      [AddCountryDetection1787734648000.BUFFER_METERS],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
          DROP COLUMN IF EXISTS country_code
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS countries`);
  }

  /**
   * `countries.geo.json` mixes Polygon and MultiPolygon features (ISO A3 in
   * `properties.A3`). ST_MakeValid repairs the minor self-intersections
   * simplified boundary data tends to carry (without it, ST_Contains is
   * unreliable on the affected countries) — but on some inputs (e.g.
   * Cameroon's) that repair produces a GeometryCollection mixing polygon
   * fragments with degenerate point/line artifacts, which MULTIPOLYGON
   * rejects outright. ST_CollectionExtract(..., 3) keeps only the polygonal
   * parts before ST_Multi normalizes everything to one consistent type.
   */
  private static async seedCountries(queryRunner: QueryRunner): Promise<void> {
    const path = join(__dirname, '..', 'countries', 'countries.geo.json');
    const collection = JSON.parse(
      readFileSync(path, 'utf-8'),
    ) as CountryFeatureCollection;

    for (const feature of collection.features) {
      const a3 = feature.properties.A3;
      if (!a3) continue;

      await queryRunner.query(
        `
          INSERT INTO countries (a3, geom)
          VALUES (
              $1,
              ST_Multi(ST_CollectionExtract(
                  ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)),
                  3
              ))
          )
          ON CONFLICT (a3) DO NOTHING
        `,
        [a3, JSON.stringify(feature.geometry)],
      );
    }
  }
}
