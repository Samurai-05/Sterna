import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets one discovery appear on several group maps without duplicating it.
 * `discoveries.group_id` remains the discovery's original destination (and
 * stays null for a personal discovery); this junction stores every group the
 * discovery is shared with, including that original group when applicable.
 */
export class AddDiscoveryGroupSharing1787734650000 implements MigrationInterface {
  name = 'AddDiscoveryGroupSharing1787734650000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE discovery_groups (
        discovery_id BIGINT NOT NULL,
        group_id BIGINT NOT NULL,

        CONSTRAINT pk_discovery_groups
          PRIMARY KEY (discovery_id, group_id),

        CONSTRAINT fk_discovery_groups_discovery
          FOREIGN KEY (discovery_id)
          REFERENCES discoveries(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_discovery_groups_group
          FOREIGN KEY (group_id)
          REFERENCES groups(id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO discovery_groups (discovery_id, group_id)
      SELECT id, group_id
      FROM discoveries
      WHERE group_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_discovery_groups_group_id
      ON discovery_groups (group_id, discovery_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE discovery_groups`);
  }
}
