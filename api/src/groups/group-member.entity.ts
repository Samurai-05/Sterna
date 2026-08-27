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
import { Group } from './group.entity';
import { GroupRole } from './group-role';

/**
 * The `group_members` table, as created by InitialSchema1787734644000.
 *
 * It carries three things at once: that a user belongs to a group, what they
 * may do there (`role`), and whether that group is the map they are currently
 * adding discoveries to (`is_active`). The last is why leaving a group needs
 * no separate "reset the active map" write — the row goes, and the flag with
 * it.
 *
 * Unlike the other tables this one has no `updated_at`, and therefore no
 * trigger.
 */
@Entity('group_members')
@Check('group_members_role_check', `role IN ('owner', 'member')`)
// The three indexes are declared by name because TypeORM drops indexes on a
// table it knows about whose names are absent from this metadata. All three
// come from InitialSchema.
//
// At most one active group per user. No active membership means the personal
// map is active — which is why this is a partial index rather than a column on
// `users`: "none of them" needs no row to represent it.
@Index('uq_group_members_one_active_group_per_user', ['userId'], {
  unique: true,
  where: 'is_active = TRUE',
})
// At most one owner per group. Note "at most": the index permits *zero*, so
// nothing but the application stops a group from being left ownerless — which
// is why GroupsService refuses to let an owner leave.
@Index('uq_group_members_one_owner_per_group', ['groupId'], {
  unique: true,
  where: `role = 'owner'`,
})
@Index('idx_group_members_group_id', ['groupId'])
export class GroupMember {
  @PrimaryColumn({
    name: 'user_id',
    type: 'bigint',
    primaryKeyConstraintName: 'group_members_pkey',
  })
  userId: string;

  @PrimaryColumn({
    name: 'group_id',
    type: 'bigint',
    primaryKeyConstraintName: 'group_members_pkey',
  })
  groupId: string;

  /**
   * The two relations below exist for their foreign keys, not for loading:
   * every read in this module is raw SQL. Without them TypeORM sees two
   * constraints on a table it manages that its metadata does not mention, and
   * the next `migration:generate` proposes dropping both — declared here with
   * the names and the ON DELETE that InitialSchema gave them, it proposes
   * nothing.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_group_members_user',
  })
  user: User;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'group_id',
    foreignKeyConstraintName: 'fk_group_members_group',
  })
  group: Group;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: GroupRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  /**
   * Whether this group is the member's active map (FR-27).
   *
   * Guarded by uq_group_members_one_active_group_per_user, so switching maps
   * has to clear the old row before setting the new one — see
   * GroupsService.setActiveMap().
   */
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;
}
