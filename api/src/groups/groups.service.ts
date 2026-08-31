import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ActiveMapDto } from './dto/active-map.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupDetailDto } from './dto/group-detail.dto';
import { GroupMemberDto } from './dto/group-member.dto';
import { GroupSummaryDto } from './dto/group-summary.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupRole } from './group-role';
import { generateInviteCode, normalizeInviteCode } from './invite-code';

/**
 * NFR-19: a group must be invisible to non-members. Answering 403 would still
 * confirm that a group with that id exists, so every route a non-member
 * reaches answers 404 with this — the same message whether the group is
 * someone else's or nobody's at all.
 */
export const GROUP_NOT_FOUND = 'No such group.';

/** What POST /api/groups/join says when the code matches nothing. */
export const NO_SUCH_INVITE_CODE = 'No group matches this invitation code.';

/**
 * uq_group_members_one_owner_per_group permits *zero* owners, so nothing in
 * the schema stops an owner from walking away and leaving a group no one can
 * rename or delete. This is where that is prevented (an open item ADR-009
 * hands to this module).
 */
export const OWNER_CANNOT_LEAVE =
  'The owner cannot leave the group. Delete the group instead.';

/** Postgres unique_violation — here, two groups drawing the same code. */
const UNIQUE_VIOLATION = '23505';

/** Codes are 30^8 apart; more than a couple of collisions means something else is wrong. */
const MAX_INVITE_CODE_ATTEMPTS = 5;

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: Date;
  role: GroupRole;
  is_active: boolean;
  member_count: string;
  discovery_count: string;
}

interface MemberRow {
  user_id: string;
  user_name: string;
  role: GroupRole;
  joined_at: Date;
}

interface ActiveMapRow {
  group_id: string;
  name: string;
}

/** True when a failed insert lost a race at a unique index. */
function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: unknown }).code === UNIQUE_VIOLATION;
}

/**
 * Groups and the active map (FR-25 … FR-33).
 *
 * Reads go through raw SQL rather than the repository API, as in
 * DiscoveriesService: every query here either aggregates across three tables
 * or has to respect an ordering the ORM has no notion of.
 *
 * The ordering in question, and the single thing to remember before touching
 * this file: `fk_discoveries_group_membership` is ON DELETE RESTRICT and
 * Postgres checks it immediately, so **a membership cannot be deleted while
 * that member still has discoveries in that group**. Both leave() and remove()
 * therefore null the discoveries out first, inside the same transaction. The
 * same trap is documented at AuthService.deleteAccount().
 */
@Injectable()
export class GroupsService {
  constructor(private readonly dataSource: DataSource) {}

  /** FR-25. The creator becomes the group's one owner. */
  async create(userId: string, dto: CreateGroupDto): Promise<GroupDetailDto> {
    return this.dataSource.transaction(async (manager) => {
      const group = await this.insertGroup(manager, dto);

      await manager.query(
        `INSERT INTO group_members (user_id, group_id, role, is_active)
         VALUES ($1, $2, $3, FALSE)`,
        [userId, group.id, GroupRole.Owner],
      );

      // is_active is FALSE on purpose: creating a group is not the same
      // gesture as switching to it, and silently moving someone's active map
      // out from under them would send their next discovery somewhere they
      // did not choose (FR-30). The client calls PUT /api/active-map.
      return this.detail(userId, group.id, manager);
    });
  }

  /** FR-26. Idempotent: re-using an invitation is a no-op, not an error. */
  async join(userId: string, rawInviteCode: string): Promise<GroupDetailDto> {
    const inviteCode = normalizeInviteCode(rawInviteCode);

    return this.dataSource.transaction(async (manager) => {
      const [group] = await manager.query<{ id: string }[]>(
        `SELECT id FROM groups WHERE invite_code = $1`,
        [inviteCode],
      );

      if (!group) {
        throw new NotFoundException(NO_SUCH_INVITE_CODE);
      }

      // An invitation is a link someone may well open twice. ON CONFLICT keeps
      // the second open from being a 409 the user cannot act on, and — because
      // it does nothing rather than overwriting — it cannot demote an owner
      // who follows their own link back to 'member'.
      await manager.query(
        `INSERT INTO group_members (user_id, group_id, role, is_active)
         VALUES ($1, $2, $3, FALSE)
         ON CONFLICT (user_id, group_id) DO NOTHING`,
        [userId, group.id, GroupRole.Member],
      );

      return this.detail(userId, group.id, manager);
    });
  }

  /** The caller's groups, with the counts the Groups screen renders. */
  async findAllForUser(userId: string): Promise<GroupSummaryDto[]> {
    const rows = await this.dataSource.query<GroupRow[]>(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.invite_code,
        g.created_at,
        gm.role,
        gm.is_active,
        (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id)
          AS member_count,
        (SELECT COUNT(*) FROM discovery_groups dg WHERE dg.group_id = g.id)
          AS discovery_count
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = $1
      ORDER BY g.name ASC, g.id ASC
    `,
      [userId],
    );

    return rows.map((row) => this.toSummary(row));
  }

  /** FR-32. 404 for a non-member — see GROUP_NOT_FOUND. */
  async findOneForMember(
    userId: string,
    groupId: string,
  ): Promise<GroupDetailDto> {
    return this.detail(userId, groupId, this.dataSource.manager);
  }

  /** Owner only. A body with nothing to change is refused, not silently ignored. */
  async update(
    userId: string,
    groupId: string,
    dto: UpdateGroupDto,
  ): Promise<GroupDetailDto> {
    if (dto.name === undefined && dto.description === undefined) {
      throw new BadRequestException(
        'The request body must contain at least one field to update.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await this.requireOwner(userId, groupId, manager);

      if (dto.name !== undefined) {
        await manager.query(`UPDATE groups SET name = $1 WHERE id = $2`, [
          dto.name,
          groupId,
        ]);
      }

      if (dto.description !== undefined) {
        await manager.query(
          `UPDATE groups SET description = $1 WHERE id = $2`,
          [dto.description, groupId],
        );
      }

      return this.detail(userId, groupId, manager);
    });
  }

  /**
   * Owner only. The group's discoveries are not destroyed with it — they go
   * back to the personal maps of whoever took them, which is also what
   * fk_discoveries_group ON DELETE SET NULL says the schema intends.
   */
  async remove(userId: string, groupId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.requireOwner(userId, groupId, manager);

      // Before the memberships, or fk_discoveries_group_membership (RESTRICT)
      // aborts the delete below.
      await manager.query(
        `UPDATE discoveries
            SET group_id = NULL, is_personal = TRUE
          WHERE group_id = $1`,
        [groupId],
      );
      await manager.query(`DELETE FROM group_members WHERE group_id = $1`, [
        groupId,
      ]);
      await manager.query(`DELETE FROM groups WHERE id = $1`, [groupId]);
    });
  }

  /** FR-33. The caller's own discoveries in the group follow them out. */
  async leave(userId: string, groupId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const role = await this.requireMembership(userId, groupId, manager);

      if (role === GroupRole.Owner) {
        throw new ConflictException(OWNER_CANNOT_LEAVE);
      }

      // Same RESTRICT as above, narrowed to this member's rows: their
      // discoveries move to their personal map rather than disappearing.
      await manager.query(
        `UPDATE discoveries
            SET group_id = NULL, is_personal = TRUE
          WHERE user_id = $1 AND group_id = $2`,
        [userId, groupId],
      );

      await manager.query(
        `DELETE FROM discovery_groups dg
          USING discoveries d
          WHERE dg.discovery_id = d.id
            AND d.user_id = $1
            AND dg.group_id = $2`,
        [userId, groupId],
      );

      // is_active lives on the row, so deleting it is also what makes the
      // personal map active again (FR-33) — there is no second write.
      await manager.query(
        `DELETE FROM group_members WHERE user_id = $1 AND group_id = $2`,
        [userId, groupId],
      );
    });
  }

  /** FR-27. Both fields null means the personal map. */
  async findActiveMap(
    userId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ActiveMapDto> {
    const [row] = await manager.query<ActiveMapRow[]>(
      `
      SELECT gm.group_id, g.name
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND gm.is_active
    `,
      [userId],
    );

    return row
      ? { groupId: row.group_id, name: row.name }
      : { groupId: null, name: null };
  }

  /** FR-28. `null` selects the personal map. */
  async setActiveMap(
    userId: string,
    groupId: string | null,
  ): Promise<ActiveMapDto> {
    return this.dataSource.transaction(async (manager) => {
      if (groupId !== null) {
        await this.requireMembership(userId, groupId, manager);
      }

      // Clear before set, always. uq_group_members_one_active_group_per_user
      // is a partial UNIQUE on (user_id) WHERE is_active, so setting the new
      // row first would collide with the old one.
      await manager.query(
        `UPDATE group_members
            SET is_active = FALSE
          WHERE user_id = $1 AND is_active`,
        [userId],
      );

      if (groupId !== null) {
        await manager.query(
          `UPDATE group_members
              SET is_active = TRUE
            WHERE user_id = $1 AND group_id = $2`,
          [userId, groupId],
        );
      }

      return this.findActiveMap(userId, manager);
    });
  }

  /**
   * The module's one authorization primitive, and the reason the discoveries
   * module imports this one: a discovery may only name a group its author
   * belongs to.
   *
   * Returns the caller's role so callers that care (leave, requireOwner) do
   * not need a second query.
   */
  async requireMembership(
    userId: string,
    groupId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<GroupRole> {
    const [row] = await manager.query<{ role: GroupRole }[]>(
      `SELECT role FROM group_members WHERE user_id = $1 AND group_id = $2`,
      [userId, groupId],
    );

    if (!row) {
      throw new NotFoundException(GROUP_NOT_FOUND);
    }

    return row.role;
  }

  /**
   * 403 rather than 404 here, unlike everywhere else in this file: the caller
   * is a member, so the group is already visible to them and there is nothing
   * left to hide. Telling them "you are not the owner" is the useful answer.
   */
  private async requireOwner(
    userId: string,
    groupId: string,
    manager: EntityManager,
  ): Promise<void> {
    const role = await this.requireMembership(userId, groupId, manager);

    if (role !== GroupRole.Owner) {
      throw new ForbiddenException('Only the group owner may do this.');
    }
  }

  /**
   * Inserts the group, drawing a fresh code for as long as it takes to find a
   * free one.
   *
   * The check-then-insert that a `SELECT ... WHERE invite_code = $1` would
   * give is not a lock, so the unique index is what actually decides. Catching
   * its violation and re-drawing is both the correctness fix and, at 30^8
   * codes, a branch that will realistically never be taken.
   */
  private async insertGroup(
    manager: EntityManager,
    dto: CreateGroupDto,
  ): Promise<{ id: string }> {
    for (let attempt = 1; attempt <= MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
      try {
        const [group] = await manager.query<{ id: string }[]>(
          `INSERT INTO groups (name, description, invite_code)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [dto.name, dto.description ?? null, generateInviteCode()],
        );

        return group;
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Could not allocate an invitation code. Please try again.',
    );
  }

  /** The full group, for a caller whose membership is checked here. */
  private async detail(
    userId: string,
    groupId: string,
    manager: EntityManager,
  ): Promise<GroupDetailDto> {
    await this.requireMembership(userId, groupId, manager);

    const [row] = await manager.query<GroupRow[]>(
      `
      SELECT
        g.id,
        g.name,
        g.description,
        g.invite_code,
        g.created_at,
        gm.role,
        gm.is_active,
        (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id)
          AS member_count,
        (SELECT COUNT(*) FROM discovery_groups dg WHERE dg.group_id = g.id)
          AS discovery_count
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND gm.group_id = $2
    `,
      [userId, groupId],
    );

    const members = await manager.query<MemberRow[]>(
      `
      SELECT gm.user_id, u.user_name, gm.role, gm.joined_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY gm.joined_at ASC, gm.user_id ASC
    `,
      [groupId],
    );

    return {
      ...this.toSummary(row),
      inviteCode: row.invite_code,
      createdAt: new Date(row.created_at).toISOString(),
      members: members.map((member) => this.toMember(member)),
    };
  }

  private toSummary(row: GroupRow): GroupSummaryDto {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      role: row.role,
      isActive: row.is_active,
      // COUNT() is BIGINT, which node-postgres hands back as a string.
      memberCount: Number(row.member_count),
      discoveryCount: Number(row.discovery_count),
    };
  }

  private toMember(row: MemberRow): GroupMemberDto {
    return {
      userId: row.user_id,
      userName: row.user_name,
      role: row.role,
      joinedAt: new Date(row.joined_at).toISOString(),
    };
  }
}
