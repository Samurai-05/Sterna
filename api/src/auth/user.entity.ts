import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * The `users` table, as created by InitialSchema1787734644000.
 *
 * The schema is owned by migrations (ADR-008), so this class *describes* an
 * existing table rather than specifying one: anything that does not match the
 * baseline DDL becomes a diff the next `migration:generate` tries to apply.
 */
@Entity('users')
// TypeORM's schema builder compares check constraints by name only — it drops
// every check on the table whose name is absent from this metadata — so these
// two must be spelled exactly as InitialSchema names them. The expression text
// is not compared, which is why Postgres rewriting it as
// `btrim((email)::text) <> ''::text` is harmless.
@Check('users_email_not_blank', `BTRIM(email) <> ''`)
@Check('users_user_name_not_blank', `BTRIM(user_name) <> ''`)
export class User {
  /**
   * BIGINT GENERATED ALWAYS AS IDENTITY.
   *
   * Typed `string`, which is both what node-postgres returns for bigint and
   * what TypeORM maps it to. Converting to `number` would be lossy above
   * 2^53-1, and a native `bigint` cannot be JSON-serialised at all
   * (JSON.stringify throws on it). The id therefore stays a decimal string
   * from the column to the response body and into the JWT `sub` claim, which
   * RFC 7519 requires to be a string regardless.
   */
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
    primaryKeyConstraintName: 'users_pkey',
  })
  id: string;

  /**
   * Login identifier, unique across accounts. Stored lower-cased — see
   * normalizeEmail() in auth.service.ts — so two accounts cannot differ only
   * by capitalisation, which the UNIQUE index alone would allow.
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /**
   * argon2id PHC string, never a password.
   *
   * `select: false` leaves it out of every query that does not name it, so a
   * hash cannot reach a response body through an oversight (NFR-18). Reading
   * it back takes an explicit `select`, which only login and the two
   * re-authentication paths do.
   */
  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash: string;

  /** Display name, shown as the author of a group discovery (FR-31). */
  @Column({ name: 'user_name', type: 'varchar', length: 100 })
  userName: string;

  /**
   * MinIO object key of the profile photo, or null if the account has none.
   * Produced by PhotosService.store() — same pipeline discoveries use, never a
   * client-chosen path (ADR-006).
   */
  // Initialised rather than left implicit: users.create() in register()
  // builds the entity in memory before any INSERT runs, and an explicit null
  // here is what makes the freshly-registered response report null instead
  // of an absent field, matching every row read back afterwards.
  @Column({
    name: 'avatar_object_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatarObjectKey: string | null = null;

  // The type is spelled out because TypeORM's Postgres driver maps
  // @CreateDateColumn to `timestamp` (without time zone) by default, and the
  // baseline column is TIMESTAMPTZ.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Also maintained by trg_users_set_updated_at. The trigger fires BEFORE
  // UPDATE and overwrites whatever TypeORM sends; both write NOW(), so the two
  // never disagree.
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
