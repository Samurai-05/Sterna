import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineSchema1787684100000 implements MigrationInterface {
  name = 'BaselineSchema1787684100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

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
      CREATE TABLE IF NOT EXISTS users (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          user_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT users_email_not_blank CHECK (BTRIM(email) <> ''),
          CONSTRAINT users_user_name_not_blank CHECK (BTRIM(user_name) <> '')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS groups (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT groups_name_not_blank CHECK (BTRIM(name) <> '')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_members (
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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS discoveries (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id BIGINT NOT NULL,
          group_id BIGINT NULL,
          title VARCHAR(150) NOT NULL,
          description TEXT NULL,
          category VARCHAR(30) NULL,
          location GEOMETRY(POINT, 4326) NOT NULL,
          image_object_key TEXT NOT NULL,
          discovered_at TIMESTAMPTZ NOT NULL,
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
          CONSTRAINT fk_discoveries_group_membership
              FOREIGN KEY (user_id, group_id)
              REFERENCES group_members(user_id, group_id)
              ON DELETE RESTRICT,
          CONSTRAINT discoveries_title_not_blank
              CHECK (BTRIM(title) <> ''),
          CONSTRAINT discoveries_image_object_key_not_blank
              CHECK (BTRIM(image_object_key) <> ''),
          CONSTRAINT discoveries_category_check
              CHECK (
                  category IS NULL
                  OR category IN (
                      'Landscape',
                      'Monument',
                      'Food',
                      'Animal',
                      'Plant',
                      'Culture',
                      'Other'
                  )
              )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pois (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          title VARCHAR(150) NOT NULL,
          description TEXT NULL,
          location GEOMETRY(POINT, 4326) NOT NULL,
          image_url TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT pois_title_not_blank CHECK (BTRIM(title) <> ''),
          CONSTRAINT pois_image_url_not_blank
              CHECK (image_url IS NULL OR BTRIM(image_url) <> '')
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at'
          ) THEN
              CREATE TRIGGER trg_users_set_updated_at
              BEFORE UPDATE ON users
              FOR EACH ROW
              EXECUTE FUNCTION set_updated_at();
          END IF;

          IF NOT EXISTS (
              SELECT 1 FROM pg_trigger WHERE tgname = 'trg_groups_set_updated_at'
          ) THEN
              CREATE TRIGGER trg_groups_set_updated_at
              BEFORE UPDATE ON groups
              FOR EACH ROW
              EXECUTE FUNCTION set_updated_at();
          END IF;

          IF NOT EXISTS (
              SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discoveries_set_updated_at'
          ) THEN
              CREATE TRIGGER trg_discoveries_set_updated_at
              BEFORE UPDATE ON discoveries
              FOR EACH ROW
              EXECUTE FUNCTION set_updated_at();
          END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_group_members_one_active_group_per_user
      ON group_members (user_id)
      WHERE is_active = TRUE
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_group_members_one_owner_per_group
      ON group_members (group_id)
      WHERE role = 'owner'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_group_members_group_id
      ON group_members (group_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discoveries_user_group
      ON discoveries (user_id, group_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discoveries_group_id
      ON discoveries (group_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discoveries_discovered_at
      ON discoveries (discovered_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_discoveries_location
      ON discoveries
      USING GIST (location)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pois_location
      ON pois
      USING GIST (location)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pois_location`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoveries_location`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoveries_discovered_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoveries_group_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_discoveries_user_group`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_group_members_group_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_group_members_one_owner_per_group`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_group_members_one_active_group_per_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS discoveries`);
    await queryRunner.query(`DROP TABLE IF EXISTS pois`);
    await queryRunner.query(`DROP TABLE IF EXISTS group_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS groups`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at`);
  }
}
