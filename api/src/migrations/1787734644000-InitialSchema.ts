import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema: users, groups, group memberships, discoveries and POIs.
 *
 * The SQL is carried over from the former `infra/postgres/init/002…007` scripts,
 * which only ever ran on an empty `postgres_data` volume and had therefore never
 * been applied to any environment. Owning it here makes the schema reproducible
 * on a volume that already exists.
 *
 * `CREATE EXTENSION postgis` is repeated (idempotently) from
 * `infra/postgres/bootstrap/001_enable_postgis.sql` so this migration can also bring
 * up a database that never went through the container's bootstrap script — a test
 * database, for instance.
 */
export class InitialSchema1787734644000 implements MigrationInterface {
  name = 'InitialSchema1787734644000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // -- users ---------------------------------------------------------------

    await queryRunner.query(`
      CREATE TABLE users (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          user_name VARCHAR(100) NOT NULL,

          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

          CONSTRAINT users_email_not_blank
              CHECK (BTRIM(email) <> ''),

          CONSTRAINT users_user_name_not_blank
              CHECK (BTRIM(user_name) <> '')
      )
    `);

    // Generic trigger function used by every table that has an updated_at column.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_users_set_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    // -- groups --------------------------------------------------------------
    // A personal map is not represented by a row in this table.

    await queryRunner.query(`
      CREATE TABLE groups (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

          name VARCHAR(100) NOT NULL,
          description TEXT NULL,

          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

          CONSTRAINT groups_name_not_blank
              CHECK (BTRIM(name) <> '')
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_groups_set_updated_at
      BEFORE UPDATE ON groups
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    // -- group_members -------------------------------------------------------
    // A membership also stores the user's role and whether the group is active.

    await queryRunner.query(`
      CREATE TABLE group_members (
          user_id BIGINT NOT NULL,
          group_id BIGINT NOT NULL,

          role VARCHAR(20) NOT NULL DEFAULT 'member',
          joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_active BOOLEAN NOT NULL DEFAULT FALSE,

          PRIMARY KEY (user_id, group_id),

          CONSTRAINT fk_group_members_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_group_members_group
              FOREIGN KEY (group_id)
              REFERENCES groups(id)
              ON DELETE CASCADE,

          CONSTRAINT group_members_role_check
              CHECK (role IN ('owner', 'member'))
      )
    `);

    // -- discoveries ---------------------------------------------------------
    //
    // group_id IS NULL     -> personal discovery
    // group_id IS NOT NULL -> group discovery
    //
    // If a discovery belongs to a group, its author must be a member of it.

    await queryRunner.query(`
      CREATE TABLE discoveries (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

          user_id BIGINT NOT NULL,
          group_id BIGINT NULL,

          title VARCHAR(150) NOT NULL,
          description TEXT NULL,
          category VARCHAR(30) NULL,

          -- WGS 84 coordinates (SRID 4326).
          -- PostGIS POINT order is: longitude, latitude.
          location GEOMETRY(POINT, 4326) NOT NULL,

          -- Object key/path of the discovery image in object storage (MinIO).
          image_object_key TEXT NOT NULL,

          -- When the discovery actually occurred.
          discovered_at TIMESTAMPTZ NOT NULL,

          -- When the record was created/updated in Sterna.
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

          CONSTRAINT fk_discoveries_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_discoveries_group
              FOREIGN KEY (group_id)
              REFERENCES groups(id)
              ON DELETE SET NULL,

          -- If group_id is not NULL, (user_id, group_id) must exist in group_members.
          -- A membership cannot be deleted while the user still has discoveries in
          -- the group. Before leaving, the backend must either move the user's
          -- discoveries to the personal map by setting group_id to NULL, or delete
          -- them.
          CONSTRAINT fk_discoveries_group_membership
              FOREIGN KEY (user_id, group_id)
              REFERENCES group_members(user_id, group_id)
              ON DELETE RESTRICT,

          CONSTRAINT discoveries_title_not_blank
              CHECK (BTRIM(title) <> ''),

          CONSTRAINT discoveries_image_object_key_not_blank
              CHECK (BTRIM(image_object_key) <> ''),

          -- Lower-case identifiers, matching the DiscoveryCategory union the
          -- frontend sends (frontend/src/lib/mock-data.ts). Capitalisation is a
          -- display concern and belongs to the label, not to the stored value.
          CONSTRAINT discoveries_category_check
              CHECK (
                  category IS NULL
                  OR category IN (
                      'landscape',
                      'monument',
                      'food',
                      'animal',
                      'plant',
                      'culture',
                      'other'
                  )
              )
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_discoveries_set_updated_at
      BEFORE UPDATE ON discoveries
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    // -- pois ----------------------------------------------------------------
    //
    // There is intentionally no foreign key between discoveries and POIs:
    // whether a POI has been discovered is determined spatially with PostGIS.

    await queryRunner.query(`
      CREATE TABLE pois (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

          title VARCHAR(150) NOT NULL,
          description TEXT NULL,

          -- WGS 84 coordinates (SRID 4326).
          -- PostGIS POINT order is: longitude, latitude.
          location GEOMETRY(POINT, 4326) NOT NULL,

          image_url TEXT NULL,

          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

          CONSTRAINT pois_title_not_blank
              CHECK (BTRIM(title) <> ''),

          CONSTRAINT pois_image_url_not_blank
              CHECK (image_url IS NULL OR BTRIM(image_url) <> '')
      )
    `);

    // -- indexes and cross-row uniqueness ------------------------------------

    // A user can have at most one active group. If no membership is active,
    // the personal map is considered active.
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_group_members_one_active_group_per_user
          ON group_members (user_id)
          WHERE is_active = TRUE
    `);

    // A group can have at most one owner. The application must still ensure
    // that each group has one.
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_group_members_one_owner_per_group
          ON group_members (group_id)
          WHERE role = 'owner'
    `);

    // Speeds up queries that retrieve all members of a group.
    await queryRunner.query(`
      CREATE INDEX idx_group_members_group_id
          ON group_members (group_id)
    `);

    // Supports lookups by author and membership-related FK operations.
    await queryRunner.query(`
      CREATE INDEX idx_discoveries_user_group
          ON discoveries (user_id, group_id)
    `);

    // Speeds up loading all discoveries for a group.
    await queryRunner.query(`
      CREATE INDEX idx_discoveries_group_id
          ON discoveries (group_id)
    `);

    // Useful for chronological discovery queries.
    await queryRunner.query(`
      CREATE INDEX idx_discoveries_discovered_at
          ON discoveries (discovered_at)
    `);

    // Spatial indexes used by PostGIS queries.
    await queryRunner.query(`
      CREATE INDEX idx_discoveries_location
          ON discoveries
          USING GIST (location)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pois_location
          ON pois
          USING GIST (location)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Tables go first: dropping them takes their indexes and triggers with them.
    // Order matters — discoveries references both group_members and groups.
    await queryRunner.query(`DROP TABLE IF EXISTS pois`);
    await queryRunner.query(`DROP TABLE IF EXISTS discoveries`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS groups`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at()`);

    // The postgis extension is deliberately left in place: it is created by the
    // container's bootstrap script as well, and other databases/objects may rely on it.
  }
}
