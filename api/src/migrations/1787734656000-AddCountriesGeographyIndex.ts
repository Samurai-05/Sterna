import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PoisService resolves each POI's country with two lookups: an exact
 * ST_Contains match, falling back to the nearest country within
 * COUNTRY_MATCH_BUFFER_METERS via a geography-cast ST_DWithin (for POIs
 * that sit just outside a simplified coastline). Only the first is covered
 * by idx_countries_geom, a plain geometry GIST index — the geography cast
 * needs its own index or Postgres falls back to a sequential scan of
 * `countries` for every POI. That was already slow at 195 POIs and became
 * untenable (50+ seconds for GET /api/pois) once ExpandMvpPois grew the
 * catalogue to ~920 rows.
 */
export class AddCountriesGeographyIndex1787734656000 implements MigrationInterface {
  name = 'AddCountriesGeographyIndex1787734656000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_countries_geom_geography
        ON countries USING GIST ((geom::geography))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_countries_geom_geography`);
  }
}
