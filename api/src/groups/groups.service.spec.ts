import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { GroupRole } from './group-role';
import { GroupsService } from './groups.service';

/**
 * The service talks to Postgres in SQL, so the mock below is a query log: each
 * test asserts on the statements that were issued and in what order. That is
 * not incidental — the ordering constraints this module lives under
 * (fk_discoveries_group_membership RESTRICT, the partial unique index on the
 * active membership) are exactly the kind of thing an ORM-level assertion
 * would not see.
 */
describe('GroupsService', () => {
  // Typed, so the assertions below can read a call's SQL and its parameters
  // without every one of them tripping no-unsafe-member-access.
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]?]>();
  const manager = { query };
  const dataSource = { manager, transaction: jest.fn() };

  let service: GroupsService;

  /** The SQL of every statement issued, whitespace-collapsed for matching. */
  const statements = (): string[] =>
    query.mock.calls.map((call) => call[0].replace(/\s+/g, ' ').trim());

  const indexOfStatement = (fragment: string): number =>
    statements().findIndex((sql) => sql.includes(fragment));

  /** Answers the next query with `rows`, and everything after it with none. */
  const answer = (...rows: unknown[][]): void => {
    rows.forEach((row) => query.mockResolvedValueOnce(row));
    query.mockResolvedValue([]);
  };

  const groupRow = (overrides: Record<string, unknown> = {}) => ({
    id: '7',
    name: 'Paris Weekend',
    description: null,
    invite_code: 'AB3K9QZ2',
    created_at: new Date('2026-08-26T09:14:33.482Z'),
    role: GroupRole.Member,
    is_active: false,
    member_count: '2',
    discovery_count: '5',
    ...overrides,
  });

  const memberRow = () => ({
    user_id: '1',
    user_name: 'Ada',
    role: GroupRole.Owner,
    joined_at: new Date('2026-08-26T09:14:33.482Z'),
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    query.mockResolvedValue([]);
    dataSource.transaction.mockImplementation(
      (run: (m: typeof manager) => Promise<unknown>) => run(manager),
    );

    const module = await Test.createTestingModule({
      providers: [GroupsService, { provide: DataSource, useValue: dataSource }],
    }).compile();

    service = module.get(GroupsService);
  });

  describe('create', () => {
    // FR-25.
    it('makes the creator the owner', async () => {
      answer(
        [{ id: '7' }], // INSERT INTO groups
        [], // INSERT INTO group_members
        [{ role: GroupRole.Owner }], // requireMembership inside detail()
        [groupRow({ role: GroupRole.Owner })],
        [memberRow()],
      );

      const group = await service.create('1', { name: 'Paris Weekend' });

      const insert = query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO group_members'),
      );

      expect(insert?.[1]).toEqual(['1', '7', GroupRole.Owner]);
      expect(group.role).toBe(GroupRole.Owner);
      expect(group.inviteCode).toBe('AB3K9QZ2');
    });

    // A new group must not silently redirect the next discovery (FR-30).
    it('does not make the new group the active map', async () => {
      answer(
        [{ id: '7' }],
        [],
        [{ role: GroupRole.Owner }],
        [groupRow({ role: GroupRole.Owner })],
        [memberRow()],
      );

      await service.create('1', { name: 'Paris Weekend' });

      const insert = query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO group_members'),
      );

      expect(insert?.[0]).toContain('FALSE');
    });

    it('draws another code when one collides at the unique index', async () => {
      query.mockRejectedValueOnce(
        Object.assign(new Error('dup'), { code: '23505' }),
      );
      answer(
        [{ id: '7' }],
        [],
        [{ role: GroupRole.Owner }],
        [groupRow({ role: GroupRole.Owner })],
        [memberRow()],
      );

      await expect(
        service.create('1', { name: 'Paris Weekend' }),
      ).resolves.toMatchObject({ id: '7' });

      const inserts = statements().filter((sql) =>
        sql.includes('INSERT INTO groups'),
      );

      expect(inserts).toHaveLength(2);
    });

    it('does not retry a failure that is not a collision', async () => {
      query.mockRejectedValueOnce(
        Object.assign(new Error('connection lost'), { code: '08006' }),
      );

      await expect(
        service.create('1', { name: 'Paris Weekend' }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('join', () => {
    // FR-26.
    it('resolves the code case-insensitively and ignoring dashes', async () => {
      answer(
        [{ id: '7' }], // SELECT ... WHERE invite_code = $1
        [], // INSERT ... ON CONFLICT DO NOTHING
        [{ role: GroupRole.Member }],
        [groupRow()],
        [memberRow()],
      );

      await service.join('2', ' ab3k-9qz2 ');

      const lookup = query.mock.calls.find((call) =>
        call[0].includes('WHERE invite_code'),
      );

      expect(lookup?.[1]).toEqual(['AB3K9QZ2']);
    });

    it('refuses a code that matches no group', async () => {
      answer([]);

      await expect(service.join('2', 'NOPE')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    // An invitation link is something people open twice.
    it('is a no-op when the caller is already a member', async () => {
      answer(
        [{ id: '7' }],
        [],
        [{ role: GroupRole.Owner }],
        [groupRow({ role: GroupRole.Owner })],
        [memberRow()],
      );

      const group = await service.join('1', 'AB3K9QZ2');

      expect(
        indexOfStatement('ON CONFLICT (user_id, group_id) DO NOTHING'),
      ).toBeGreaterThan(-1);
      // The owner who follows their own link back is still the owner.
      expect(group.role).toBe(GroupRole.Owner);
    });
  });

  describe('findOneForMember', () => {
    // NFR-19: a group is invisible to people outside it, its existence
    // included — hence 404 rather than 403.
    it('answers 404 to a non-member', async () => {
      answer([]);

      await expect(service.findOneForMember('9', '7')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('reports the counts as numbers, not bigint strings', async () => {
      answer([{ role: GroupRole.Member }], [groupRow()], [memberRow()]);

      const group = await service.findOneForMember('2', '7');

      expect(group.memberCount).toBe(2);
      expect(group.discoveryCount).toBe(5);
    });
  });

  describe('update', () => {
    it('refuses a body with nothing to change', async () => {
      await expect(service.update('1', '7', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(query).not.toHaveBeenCalled();
    });

    // A member can already see the group, so there is nothing left to hide.
    it('answers 403 to a member who is not the owner', async () => {
      answer([{ role: GroupRole.Member }]);

      await expect(
        service.update('2', '7', { name: 'Renamed' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('answers 404 to a non-member', async () => {
      answer([]);

      await expect(
        service.update('9', '7', { name: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('answers 403 to a member who is not the owner', async () => {
      answer([{ role: GroupRole.Member }]);

      await expect(service.remove('2', '7')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    // fk_discoveries_group_membership is ON DELETE RESTRICT and Postgres
    // checks it immediately: deleting the memberships first aborts.
    it('detaches the discoveries before deleting the memberships', async () => {
      answer([{ role: GroupRole.Owner }]);

      await service.remove('1', '7');

      expect(
        indexOfStatement('UPDATE discoveries SET group_id = NULL'),
      ).toBeLessThan(indexOfStatement('DELETE FROM group_members'));
      expect(indexOfStatement('DELETE FROM group_members')).toBeLessThan(
        indexOfStatement('DELETE FROM groups'),
      );
    });
  });

  describe('leave', () => {
    // uq_group_members_one_owner_per_group permits zero owners, so nothing in
    // the schema stops a group from being abandoned.
    it('refuses to let the owner leave', async () => {
      answer([{ role: GroupRole.Owner }]);

      await expect(service.leave('1', '7')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(indexOfStatement('DELETE FROM group_members')).toBe(-1);
    });

    // FR-33: the discoveries move to the personal map rather than vanishing —
    // and they have to move first, for the same RESTRICT reason as remove().
    it('moves the caller discoveries to the personal map first', async () => {
      answer([{ role: GroupRole.Member }]);

      await service.leave('2', '7');

      const update = query.mock.calls.find((call) =>
        call[0].includes('UPDATE discoveries'),
      );

      expect(update?.[1]).toEqual(['2', '7']);
      expect(indexOfStatement('UPDATE discoveries')).toBeLessThan(
        indexOfStatement('DELETE FROM group_members'),
      );
    });

    it('answers 404 to someone who is not a member', async () => {
      answer([]);

      await expect(service.leave('9', '7')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('the active map', () => {
    // FR-27: no active membership means the personal map.
    it('reports the personal map when no membership is active', async () => {
      answer([]);

      await expect(service.findActiveMap('1')).resolves.toEqual({
        groupId: null,
        name: null,
      });
    });

    it('reports the active group when there is one', async () => {
      answer([{ group_id: '7', name: 'Paris Weekend' }]);

      await expect(service.findActiveMap('1')).resolves.toEqual({
        groupId: '7',
        name: 'Paris Weekend',
      });
    });

    // uq_group_members_one_active_group_per_user is a partial UNIQUE on
    // (user_id) WHERE is_active, so setting before clearing collides.
    it('clears the previous active map before setting the new one', async () => {
      answer([{ role: GroupRole.Member }]);

      await service.setActiveMap('1', '7');

      expect(indexOfStatement('SET is_active = FALSE')).toBeLessThan(
        indexOfStatement('SET is_active = TRUE'),
      );
    });

    it('only clears when switching back to the personal map', async () => {
      answer([]);

      await service.setActiveMap('1', null);

      expect(indexOfStatement('SET is_active = TRUE')).toBe(-1);
      expect(indexOfStatement('SET is_active = FALSE')).toBeGreaterThan(-1);
    });

    // NFR-19 again: selecting someone else's group must not even confirm it.
    it('refuses a group the caller does not belong to', async () => {
      answer([]);

      await expect(service.setActiveMap('9', '7')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(indexOfStatement('SET is_active')).toBe(-1);
    });
  });

  describe('requireMembership', () => {
    it('returns the caller role', async () => {
      answer([{ role: GroupRole.Owner }]);

      await expect(service.requireMembership('1', '7')).resolves.toBe(
        GroupRole.Owner,
      );
    });

    it('throws when there is no membership', async () => {
      answer([]);

      await expect(service.requireMembership('9', '7')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
