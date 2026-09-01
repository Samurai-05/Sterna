import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';

/**
 * The `photos` table, as created by AddPhotoOwnership1787734653000.
 *
 * One row per object in MinIO, recording who uploaded it. ADR-006 always
 * placed the owner here; until this table existed, ownership of an object was
 * inferred from whoever referenced its key, which is not the same thing —
 * `image_object_key` is handed to every member of a shared group map, so
 * "references it" and "uploaded it" came apart.
 *
 * The schema is owned by migrations (ADR-008): this class *describes* the
 * table rather than specifying it.
 */
@Entity('photos')
// Compared by name only, like the checks on `users` — see user.entity.ts.
@Check(
  'photos_object_key_pattern',
  `object_key ~ '^photos/[0-9a-f-]{36}\\.(jpg|png|webp)$'`,
)
export class Photo {
  /**
   * The full MinIO object key, `photos/<uuid>.<ext>`. It is the primary key
   * rather than a surrogate id because it is already unique, already the thing
   * every other table stores, and the only value the read endpoint has to work
   * from.
   */
  @PrimaryColumn({
    name: 'object_key',
    type: 'text',
    primaryKeyConstraintName: 'photos_pkey',
  })
  objectKey: string;

  /** The uploader. Decimal string, per the ADR-009 bigint convention. */
  @Index('idx_photos_user_id')
  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  // Declared only so `migration:generate` sees fk_photos_user and leaves it
  // alone; nothing loads through it (every query here goes through userId).
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'fk_photos_user',
  })
  user?: User;

  /** As re-encoded by PhotosService.normalize(), never the declared type. */
  @Column({ name: 'content_type', type: 'varchar', length: 100 })
  contentType: string;

  /** Size of the stored (re-encoded) object; null for backfilled rows. */
  @Column({ name: 'byte_size', type: 'bigint', nullable: true })
  byteSize: string | null;

  // Spelled out: TypeORM's Postgres driver maps @CreateDateColumn to
  // `timestamp` without time zone by default, and the column is TIMESTAMPTZ.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
