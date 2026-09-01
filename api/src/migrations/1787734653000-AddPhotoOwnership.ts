import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records who uploaded each object in MinIO.
 *
 * ADR-006 always specified that PostgreSQL holds the photo metadata —
 * "the discovery identifier, the owner, the MinIO object key, the MIME type" —
 * but the table was never built, so an object key had no owner anywhere in the
 * schema. Ownership was inferred from whoever happened to reference the key,
 * which let a user reference a key they had merely seen (group maps hand out
 * `image_object_key` in full) and then have the API delete somebody else's
 * object on their behalf.
 *
 * The CHECK is added after the backfill on purpose: it is the format
 * PhotosService.store() has always produced, but a legacy row that predates it
 * must not abort the migration.
 */
export class AddPhotoOwnership1787734653000 implements MigrationInterface {
  name = 'AddPhotoOwnership1787734653000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE photos (
          object_key   TEXT PRIMARY KEY,

          user_id      BIGINT NOT NULL,

          content_type VARCHAR(100) NOT NULL,
          byte_size    BIGINT NULL,

          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

          -- An account's objects go with it. deleteAccount() still removes them
          -- from MinIO explicitly: this only keeps the metadata consistent.
          CONSTRAINT fk_photos_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_photos_user_id ON photos (user_id)
    `);

    // Backfill from the two columns that reference a key today. Without this
    // every existing photo becomes unreadable (no owner row to authorize
    // against) and unfreeable (removeOwned finds nothing to delete).
    await queryRunner.query(`
      INSERT INTO photos (object_key, user_id, content_type)
      SELECT
          d.image_object_key,
          d.user_id,
          CASE
              WHEN d.image_object_key LIKE '%.png'  THEN 'image/png'
              WHEN d.image_object_key LIKE '%.webp' THEN 'image/webp'
              ELSE 'image/jpeg'
          END
      FROM discoveries d
      WHERE d.image_object_key ~ '^photos/[0-9a-f-]{36}\\.(jpg|png|webp)$'
      ON CONFLICT (object_key) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO photos (object_key, user_id, content_type)
      SELECT
          u.avatar_object_key,
          u.id,
          CASE
              WHEN u.avatar_object_key LIKE '%.png'  THEN 'image/png'
              WHEN u.avatar_object_key LIKE '%.webp' THEN 'image/webp'
              ELSE 'image/jpeg'
          END
      FROM users u
      WHERE u.avatar_object_key IS NOT NULL
        AND u.avatar_object_key ~ '^photos/[0-9a-f-]{36}\\.(jpg|png|webp)$'
      ON CONFLICT (object_key) DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE photos
          ADD CONSTRAINT photos_object_key_pattern
          CHECK (object_key ~ '^photos/[0-9a-f-]{36}\\.(jpg|png|webp)$')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS photos`);
  }
}
