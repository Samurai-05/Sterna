import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { INVITE_CODE_MAX_LENGTH } from './invite-code';

/**
 * The `groups` table, as created by InitialSchema1787734644000 and extended by
 * AddGroupInviteCode1787734647000.
 *
 * The schema is owned by migrations (ADR-008), so this class *describes* an
 * existing table rather than specifying one: anything that does not match the
 * DDL becomes a diff the next `migration:generate` tries to apply.
 *
 * A personal map is not a row here. It is the absence of a group: a discovery
 * whose group_id is NULL belongs to its author's personal map, and a user with
 * no active membership has their personal map active.
 */
@Entity('groups')
// TypeORM compares check constraints by name only and drops every check on the
// table whose name is absent from this metadata, so both must be spelled
// exactly as the migrations name them. The expression text is not compared.
@Check('groups_name_not_blank', `BTRIM(name) <> ''`)
@Check('groups_invite_code_not_blank', `BTRIM(invite_code) <> ''`)
export class Group {
  /** BIGINT GENERATED ALWAYS AS IDENTITY, typed `string` — see User.id. */
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'ALWAYS',
    primaryKeyConstraintName: 'groups_pkey',
  })
  id: string;

  /** Not unique: two unrelated groups may both be called "Weekend". */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * The invitation code (FR-26). Unique across groups, because it is the only
   * thing POST /api/groups/join is given to resolve a group by.
   */
  @Column({
    name: 'invite_code',
    type: 'varchar',
    length: INVITE_CODE_MAX_LENGTH,
    unique: true,
  })
  inviteCode: string;

  // The type is spelled out because TypeORM's Postgres driver maps
  // @CreateDateColumn to `timestamp` (without time zone) by default, and the
  // baseline column is TIMESTAMPTZ.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Also maintained by trg_groups_set_updated_at, which fires BEFORE UPDATE
  // and overwrites whatever TypeORM sends. Both write NOW().
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
