import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ActiveMapDto } from './../src/groups/dto/active-map.dto';
import { GroupDetailDto } from './../src/groups/dto/group-detail.dto';
import { GroupSummaryDto } from './../src/groups/dto/group-summary.dto';
import { GroupRole } from './../src/groups/group-role';
import {
  createTestApp,
  deleteTestUsers,
  registerTestUser,
  uploadTestPhoto,
} from './e2e-app';

interface DiscoveryResponse {
  id: string;
  userId: string;
  groupId: string | null;
  groupIds: string[];
  personal: boolean;
  title: string;
  authorUserName: string;
}

/**
 * The group flow end to end, against the real database (NFR-31): a group is
 * created, an invitation code carries a second account into it, discoveries
 * land on the shared map, an outsider is refused, and leaving puts the
 * discoveries back on their author's personal map.
 */
describe('Groups (e2e)', () => {
  let app: INestApplication<App>;

  /** The owner. */
  let ada: string;
  /** A member who joins by code. */
  let linus: string;
  let linusId: string;
  /** Belongs to no group at all — the NFR-19 probe. */
  let outsider: string;
  let photoKey: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const discovery = (groupId: string | null, title: string) => ({
    groupId,
    title,
    description: null,
    category: 'Other',
    longitude: 6.6412,
    latitude: 46.7785,
    imageObjectKey: photoKey,
    locationSource: 'manual',
    discoveredAt: '2026-08-25T12:00:00.000Z',
  });

  const createGroup = async (name: string): Promise<GroupDetailDto> => {
    const response = await request(app.getHttpServer())
      .post('/api/groups')
      .set(auth(ada))
      .send({ name })
      .expect(201);

    return response.body as GroupDetailDto;
  };

  beforeAll(async () => {
    app = await createTestApp();

    ada = (await registerTestUser(app)).accessToken;
    photoKey = await uploadTestPhoto(app, ada);

    const member = await registerTestUser(app);
    linus = member.accessToken;
    linusId = member.user.id;

    outsider = (await registerTestUser(app)).accessToken;
  });

  afterAll(async () => {
    await deleteTestUsers(app);
    await app.close();
  });

  describe('creating a group', () => {
    // FR-25, FR-26.
    it('makes the creator the owner and issues an invitation code', async () => {
      const group = await createGroup('Paris Weekend');

      expect(group).toEqual(
        expect.objectContaining({
          name: 'Paris Weekend',
          role: GroupRole.Owner,
          isActive: false,
          memberCount: 1,
          discoveryCount: 0,
        }),
      );
      expect(group.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
      expect(group.members).toHaveLength(1);
    });

    it('refuses a blank name', async () => {
      await request(app.getHttpServer())
        .post('/api/groups')
        .set(auth(ada))
        .send({ name: '   ' })
        .expect(400);
    });

    it('refuses an unauthenticated caller', async () => {
      await request(app.getHttpServer())
        .post('/api/groups')
        .send({ name: 'Anonymous' })
        .expect(401);
    });
  });

  describe('joining with an invitation code', () => {
    // FR-26: the code has to work in whatever shape it was typed.
    it('accepts the code lower-cased and with dashes', async () => {
      const group = await createGroup('Join by code');
      const typed = `${group.inviteCode.slice(0, 4)}-${group.inviteCode.slice(4)}`;

      const response = await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: typed.toLowerCase() })
        .expect(200);

      const joined = response.body as GroupDetailDto;

      expect(joined.id).toBe(group.id);
      expect(joined.role).toBe(GroupRole.Member);
      expect(joined.memberCount).toBe(2);
    });

    it('is a no-op the second time the same link is opened', async () => {
      const group = await createGroup('Opened twice');

      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      expect((response.body as GroupDetailDto).memberCount).toBe(2);
    });

    it('refuses a code that matches no group', async () => {
      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: 'ZZZZZZZZ' })
        .expect(404);
    });
  });

  describe('group visibility', () => {
    // NFR-19: 404 rather than 403 — the API does not confirm the group exists.
    it('hides a group from someone who is not a member', async () => {
      const group = await createGroup('Private');

      await request(app.getHttpServer())
        .get(`/api/groups/${group.id}`)
        .set(auth(outsider))
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/groups/${group.id}/discoveries`)
        .set(auth(outsider))
        .expect(404);

      const response = await request(app.getHttpServer())
        .get('/api/groups')
        .set(auth(outsider))
        .expect(200);

      const groups = response.body as GroupSummaryDto[];

      expect(groups.some((listed) => listed.id === group.id)).toBe(false);
    });

    it('refuses to make someone else group the active map', async () => {
      const group = await createGroup('Not yours');

      await request(app.getHttpServer())
        .put('/api/active-map')
        .set(auth(outsider))
        .send({ groupId: group.id })
        .expect(404);
    });

    it('refuses a discovery aimed at a group the caller is not in', async () => {
      const group = await createGroup('Not yours either');

      await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(outsider))
        .send(discovery(group.id, 'trespassing'))
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(outsider))
        .send({
          ...discovery(null, 'shared-trespassing'),
          groupIds: [group.id],
        })
        .expect(404);
    });
  });

  describe('the active map', () => {
    // FR-27: a new account has no active membership, so the personal map.
    it('starts on the personal map', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/active-map')
        .set(auth(outsider))
        .expect(200);

      expect(response.body as ActiveMapDto).toEqual({
        groupId: null,
        name: null,
      });
    });

    // FR-28, and the partial unique index behind it: switching twice must not
    // leave two active memberships.
    it('switches between groups and back to the personal map', async () => {
      const first = await createGroup('First map');
      const second = await createGroup('Second map');

      await request(app.getHttpServer())
        .put('/api/active-map')
        .set(auth(ada))
        .send({ groupId: first.id })
        .expect(200);

      const switched = await request(app.getHttpServer())
        .put('/api/active-map')
        .set(auth(ada))
        .send({ groupId: second.id })
        .expect(200);

      expect(switched.body as ActiveMapDto).toEqual({
        groupId: second.id,
        name: 'Second map',
      });

      const listed = await request(app.getHttpServer())
        .get('/api/groups')
        .set(auth(ada))
        .expect(200);

      const active = (listed.body as GroupSummaryDto[]).filter(
        (group) => group.isActive,
      );

      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(second.id);

      const cleared = await request(app.getHttpServer())
        .put('/api/active-map')
        .set(auth(ada))
        .send({ groupId: null })
        .expect(200);

      expect(cleared.body as ActiveMapDto).toEqual({
        groupId: null,
        name: null,
      });
    });
  });

  describe('the group map', () => {
    // FR-29, FR-31 and the visibility rule the whole feature turns on.
    it('shows a member discovery only on the group map', async () => {
      const group = await createGroup('Shared map');

      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      const created = await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(linus))
        .send(discovery(group.id, 'shared-find'))
        .expect(201);

      const { id } = created.body as DiscoveryResponse;

      // Visible to the other member, carrying its author (FR-31).
      const groupMap = await request(app.getHttpServer())
        .get(`/api/groups/${group.id}/discoveries`)
        .set(auth(ada))
        .expect(200);

      const shared = (groupMap.body as DiscoveryResponse[]).find(
        (found) => found.id === id,
      );

      expect(shared).toBeDefined();
      expect(shared?.userId).toBe(linusId);
      expect(shared?.authorUserName).toBe('E2E');

      // A group discovery must not leak onto its author's personal map.
      const personal = await request(app.getHttpServer())
        .get('/api/discoveries')
        .set(auth(linus))
        .expect(200);

      expect(
        (personal.body as DiscoveryResponse[]).some((found) => found.id === id),
      ).toBe(false);

      // But not on anyone else's (NFR-24).
      const owners = await request(app.getHttpServer())
        .get('/api/discoveries')
        .set(auth(ada))
        .expect(200);

      expect(
        (owners.body as DiscoveryResponse[]).some((found) => found.id === id),
      ).toBe(false);
    });

    // NFR-25: a personal discovery is never pulled into a group.
    it('keeps personal discoveries off the group map', async () => {
      const group = await createGroup('No leakage');

      const created = await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(ada))
        .send(discovery(null, 'personal-only'))
        .expect(201);

      const { id } = created.body as DiscoveryResponse;

      const groupMap = await request(app.getHttpServer())
        .get(`/api/groups/${group.id}/discoveries`)
        .set(auth(ada))
        .expect(200);

      expect(
        (groupMap.body as DiscoveryResponse[]).some((found) => found.id === id),
      ).toBe(false);
    });

    it('shares one discovery with several groups and updates those shares', async () => {
      const first = await createGroup('First shared destination');
      const second = await createGroup('Second shared destination');

      const createdResponse = await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(ada))
        .send({
          ...discovery(null, 'shared-with-several'),
          groupIds: [first.id, second.id],
        })
        .expect(201);

      const created = createdResponse.body as DiscoveryResponse;
      expect(created.groupId).toBeNull();
      expect(created.groupIds).toEqual(
        expect.arrayContaining([first.id, second.id]),
      );

      for (const group of [first, second]) {
        const response = await request(app.getHttpServer())
          .get(`/api/groups/${group.id}/discoveries`)
          .set(auth(ada))
          .expect(200);
        expect(
          (response.body as DiscoveryResponse[]).some(
            (discoveryInGroup) => discoveryInGroup.id === created.id,
          ),
        ).toBe(true);
      }

      await request(app.getHttpServer())
        .patch(`/api/discoveries/${created.id}`)
        .set(auth(ada))
        .send({ groupIds: [second.id] })
        .expect(200);

      const firstMap = await request(app.getHttpServer())
        .get(`/api/groups/${first.id}/discoveries`)
        .set(auth(ada))
        .expect(200);
      const secondMap = await request(app.getHttpServer())
        .get(`/api/groups/${second.id}/discoveries`)
        .set(auth(ada))
        .expect(200);
      const personalMap = await request(app.getHttpServer())
        .get('/api/discoveries')
        .set(auth(ada))
        .expect(200);

      expect(
        (firstMap.body as DiscoveryResponse[]).some(
          (discoveryInGroup) => discoveryInGroup.id === created.id,
        ),
      ).toBe(false);
      expect(
        (secondMap.body as DiscoveryResponse[]).some(
          (discoveryInGroup) => discoveryInGroup.id === created.id,
        ),
      ).toBe(true);
      expect(
        (personalMap.body as DiscoveryResponse[]).some(
          (personalDiscovery) => personalDiscovery.id === created.id,
        ),
      ).toBe(true);
    });

    it('can keep a group discovery on the personal map too', async () => {
      const group = await createGroup('Personal and shared');

      const createdResponse = await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(ada))
        .send({
          ...discovery(group.id, 'also-personal'),
          personal: true,
        })
        .expect(201);

      const created = createdResponse.body as DiscoveryResponse;
      expect(created.personal).toBe(true);

      const personalMap = await request(app.getHttpServer())
        .get('/api/discoveries')
        .set(auth(ada))
        .expect(200);

      expect(
        (personalMap.body as DiscoveryResponse[]).some(
          (personalDiscovery) => personalDiscovery.id === created.id,
        ),
      ).toBe(true);

      const updatedResponse = await request(app.getHttpServer())
        .patch(`/api/discoveries/${created.id}`)
        .set(auth(ada))
        .send({ groupIds: [], personal: true })
        .expect(200);

      expect((updatedResponse.body as DiscoveryResponse).groupIds).toEqual([]);

      const groupMap = await request(app.getHttpServer())
        .get(`/api/groups/${group.id}/discoveries`)
        .set(auth(ada))
        .expect(200);

      expect(
        (groupMap.body as DiscoveryResponse[]).some(
          (groupDiscovery) => groupDiscovery.id === created.id,
        ),
      ).toBe(false);

      await request(app.getHttpServer())
        .patch(`/api/discoveries/${created.id}`)
        .set(auth(ada))
        .send({ groupIds: [], personal: false })
        .expect(400);
    });
  });

  describe('owner-only management', () => {
    it('lets the owner rename the group', async () => {
      const group = await createGroup('Before');

      const response = await request(app.getHttpServer())
        .patch(`/api/groups/${group.id}`)
        .set(auth(ada))
        .send({ name: 'After' })
        .expect(200);

      expect((response.body as GroupDetailDto).name).toBe('After');
    });

    // 403 rather than 404: a member can already see the group.
    it('refuses a rename by a plain member', async () => {
      const group = await createGroup('Members cannot rename');

      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/groups/${group.id}`)
        .set(auth(linus))
        .send({ name: 'Hijacked' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/groups/${group.id}`)
        .set(auth(linus))
        .expect(403);
    });

    it('refuses a body with nothing to update', async () => {
      const group = await createGroup('Nothing to change');

      await request(app.getHttpServer())
        .patch(`/api/groups/${group.id}`)
        .set(auth(ada))
        .send({})
        .expect(400);
    });

    // Deleting a group must not destroy the discoveries recorded in it.
    it('returns the discoveries to their authors when the group is deleted', async () => {
      const group = await createGroup('Doomed');

      const created = await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(ada))
        .send(discovery(group.id, 'survives-deletion'))
        .expect(201);

      const { id } = created.body as DiscoveryResponse;

      await request(app.getHttpServer())
        .delete(`/api/groups/${group.id}`)
        .set(auth(ada))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/groups/${group.id}`)
        .set(auth(ada))
        .expect(404);

      const personal = await request(app.getHttpServer())
        .get('/api/discoveries')
        .set(auth(ada))
        .expect(200);

      const survivor = (personal.body as DiscoveryResponse[]).find(
        (found) => found.id === id,
      );

      expect(survivor).toBeDefined();
      expect(survivor?.groupId).toBeNull();
    });
  });

  describe('leaving a group', () => {
    // FR-33, and the fk_discoveries_group_membership RESTRICT behind it.
    it('takes the member discoveries back to their personal map', async () => {
      const group = await createGroup('Leavable');

      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set(auth(linus))
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      await request(app.getHttpServer())
        .put('/api/active-map')
        .set(auth(linus))
        .send({ groupId: group.id })
        .expect(200);

      const created = await request(app.getHttpServer())
        .post('/api/discoveries')
        .set(auth(linus))
        .send(discovery(group.id, 'follows-me-out'))
        .expect(201);

      const { id } = created.body as DiscoveryResponse;

      await request(app.getHttpServer())
        .delete(`/api/groups/${group.id}/members/me`)
        .set(auth(linus))
        .expect(204);

      // The group is gone from their list, and so is their access to it.
      await request(app.getHttpServer())
        .get(`/api/groups/${group.id}`)
        .set(auth(linus))
        .expect(404);

      // The active map falls back to the personal one.
      const active = await request(app.getHttpServer())
        .get('/api/active-map')
        .set(auth(linus))
        .expect(200);

      expect(active.body as ActiveMapDto).toEqual({
        groupId: null,
        name: null,
      });

      // And the discovery came with them rather than being deleted.
      const personal = await request(app.getHttpServer())
        .get('/api/discoveries')
        .set(auth(linus))
        .expect(200);

      const moved = (personal.body as DiscoveryResponse[]).find(
        (found) => found.id === id,
      );

      expect(moved).toBeDefined();
      expect(moved?.groupId).toBeNull();
    });

    // uq_group_members_one_owner_per_group permits zero owners; this is what
    // actually stops a group from being abandoned.
    it('refuses to let the owner leave', async () => {
      const group = await createGroup('Owner stays');

      await request(app.getHttpServer())
        .delete(`/api/groups/${group.id}/members/me`)
        .set(auth(ada))
        .expect(409);
    });
  });
});
