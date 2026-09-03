import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a discovery be explicitly linked to a POI regardless of distance.
 *
 * `discovered` (PoisService.findAll/findAllAuthoredByUser) is otherwise
 * computed purely from ST_DWithin proximity within
 * POI_DISCOVERY_RADIUS_METERS (150m) — too tight for a landmark photographed
 * from a distance (a mountain shot from the valley town, a tower shot from
 * across a square). Widening that radius was rejected: two POIs can sit
 * close enough together that a wide radius would unlock both from a photo of
 * only one. This column instead lets the user explicitly confirm a specific
 * match, checked by PoisService alongside — not instead of — the existing
 * proximity check.
 *
 * ON DELETE SET NULL rather than CASCADE: deleting a POI should not delete
 * the discovery that was confirmed against it. Note for whoever next
 * regenerates the POI catalogue: ReplaceMvpPois and ExpandMvpPois both
 * `DELETE FROM pois` and re-INSERT wholesale, re-minting every pois.id — a
 * future migration following that same pattern will silently null out every
 * confirmed link via this constraint.
 */
export class AddConfirmedPoi1787734657000 implements MigrationInterface {
  name = 'AddConfirmedPoi1787734657000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
          ADD COLUMN confirmed_poi_id BIGINT NULL
          REFERENCES pois (id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX idx_discoveries_confirmed_poi_id
          ON discoveries (confirmed_poi_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
          DROP COLUMN IF EXISTS confirmed_poi_id
    `);
  }
}
