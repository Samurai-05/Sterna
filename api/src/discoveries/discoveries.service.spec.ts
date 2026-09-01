import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiscoveriesService } from './discoveries.service';
import { Discovery } from './discovery.entity';
import { GroupsService } from '../groups/groups.service';
import { PhotosService } from '../photos/photos.service';

/**
 * DiscoveriesService issues raw SQL through Repository<Discovery>.query, so
 * — same rationale as GroupsService's spec — the mock is a query log: tests
 * assert on the SQL that was issued (in particular, that the country lookup
 * CTE introduced by migration 1787734648000 is actually part of the
 * statement) rather than going through a real ORM/database.
 */
describe('DiscoveriesService', () => {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]?]>();
  const requireMembership = jest.fn();
  const ownsPhoto = jest.fn();
  const removeOwnedPhoto = jest.fn();
  const isCanonicalPhotoKey = jest.fn();
  const photoExists = jest.fn();

  let service: DiscoveriesService;

  const statement = (): string =>
    query.mock.calls[0][0].replace(/\s+/g, ' ').trim();

  const params = (): unknown[] | undefined => query.mock.calls[0][1];

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: '9',
    user_id: '1',
    group_id: null,
    group_ids: [],
    is_personal: true,
    title: 'Phi Beach',
    description: null,
    category: 'Other',
    longitude: '9.4669802',
    latitude: '41.1418826',
    image_object_key: 'photos/550e8400-e29b-41d4-a716-446655440000.jpg',
    author_user_name: 'Ada',
    country_code: 'ITA',
    location_source: null,
    discovered_at: new Date('2026-08-06T20:31:19.000Z'),
    created_at: new Date('2026-08-27T11:44:41.142Z'),
    updated_at: new Date('2026-08-27T11:44:41.142Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    query.mockResolvedValue([]);
    // The happy path for everything that is not about the photo itself.
    ownsPhoto.mockResolvedValue(true);
    isCanonicalPhotoKey.mockReturnValue(true);
    photoExists.mockResolvedValue(true);

    const module = await Test.createTestingModule({
      providers: [
        DiscoveriesService,
        { provide: getRepositoryToken(Discovery), useValue: { query } },
        { provide: GroupsService, useValue: { requireMembership } },
        {
          provide: PhotosService,
          useValue: {
            ownsPhoto,
            removeOwned: removeOwnedPhoto,
            isCanonicalObjectKey: isCanonicalPhotoKey,
            exists: photoExists,
          },
        },
      ],
    }).compile();

    service = module.get(DiscoveriesService);
  });

  describe('create', () => {
    const dto = {
      title: 'Phi Beach',
      description: null,
      category: null,
      longitude: 9.4669802,
      latitude: 41.1418826,
      imageObjectKey: 'photos/550e8400-e29b-41d4-a716-446655440000.jpg',
      locationSource: 'manual',
      discoveredAt: '2026-08-06T20:31:19.000Z',
    };

    it('looks the country up via PostGIS, falling back within the coastal buffer', async () => {
      query.mockResolvedValueOnce([row()]);

      const discovery = await service.create('1', dto);

      expect(statement()).toContain('matched_country');
      expect(statement()).toContain('ST_Contains');
      // The coastal-precision fallback (issue #59): a point outside every
      // polygon still resolves to the nearest country within this buffer,
      // instead of leaving the discovery — and its country — unmatched.
      expect(statement()).toContain('ST_DWithin');
      expect(statement()).toContain('5000');
      expect(discovery.countryCode).toBe('ITA');
    });

    it('binds longitude/latitude in the same $6/$7 slots the point CTE reads', async () => {
      query.mockResolvedValueOnce([row()]);

      await service.create('1', dto);

      expect(params()).toEqual([
        '1',
        null,
        dto.title,
        null,
        null,
        dto.longitude,
        dto.latitude,
        dto.imageObjectKey,
        dto.locationSource,
        dto.discoveredAt,
        true,
        [],
      ]);
    });

    // The key is returned in full on every shared group map, so citing
    // one proves nothing about who uploaded it.
    it('refuses a photo the caller did not upload', async () => {
      ownsPhoto.mockResolvedValue(false);

      await expect(service.create('1', dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(ownsPhoto).toHaveBeenCalledWith('1', dto.imageObjectKey);
      expect(query).not.toHaveBeenCalled();
    });

    // NFR-32, the check PhotosService.exists() was written for.
    it('refuses a photo that is not in object storage', async () => {
      photoExists.mockResolvedValue(false);

      await expect(service.create('1', dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(query).not.toHaveBeenCalled();
    });

    // Not-yours and not-there must not be distinguishable, or the endpoint
    // becomes an oracle for which keys exist.
    it("gives the same message whether the photo is missing or not the caller's", async () => {
      const message = 'Unknown photo.';

      ownsPhoto.mockResolvedValue(false);
      await expect(service.create('1', dto)).rejects.toThrow(message);

      ownsPhoto.mockResolvedValue(true);
      photoExists.mockResolvedValue(false);
      await expect(service.create('1', dto)).rejects.toThrow(message);
    });

    it('returns null countryCode for a discovery nowhere near any coastline', async () => {
      query.mockResolvedValueOnce([row({ country_code: null })]);

      const discovery = await service.create('1', dto);

      expect(discovery.countryCode).toBeNull();
    });

    it('requires membership before creating a discovery on a group map', async () => {
      requireMembership.mockRejectedValueOnce(
        new NotFoundException('Group not found.'),
      );

      await expect(
        service.create('1', { ...dto, groupId: '7' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(requireMembership).toHaveBeenCalledWith('1', '7');
      expect(query).not.toHaveBeenCalled();
    });

    it('requires at least one destination map', async () => {
      await expect(
        service.create('1', { ...dto, personal: false }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(query).not.toHaveBeenCalled();
    });

    it('rejects a non-canonical photo key before database insertion', async () => {
      isCanonicalPhotoKey.mockReturnValue(false);

      await expect(
        service.create('1', { ...dto, imageObjectKey: 'photos/a.map.webp' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(query).not.toHaveBeenCalled();
    });

    it('rejects a canonical photo key when the original object is absent', async () => {
      photoExists.mockResolvedValue(false);

      await expect(service.create('1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(photoExists).toHaveBeenCalledWith(dto.imageObjectKey);
      expect(query).not.toHaveBeenCalled();
    });

    it('persists the final location source with the coordinates', async () => {
      query.mockResolvedValueOnce([row({ location_source: 'manual' })]);

      await service.create('1', { ...dto, locationSource: 'manual' });

      expect(params()).toContain('manual');
      expect(statement()).toContain('location_source');
    });

    it('requires membership in every group and stores all selected groups', async () => {
      query.mockResolvedValueOnce([
        row({ group_ids: ['7', '8'], group_id: '7' }),
      ]);

      const discovery = await service.create('1', {
        ...dto,
        groupId: '7',
        groupIds: ['8', '7'],
      });

      expect(requireMembership).toHaveBeenCalledTimes(2);
      expect(requireMembership).toHaveBeenCalledWith('1', '7');
      expect(requireMembership).toHaveBeenCalledWith('1', '8');
      expect(params()?.[11]).toEqual(['7', '8']);
      expect(discovery.groupIds).toEqual(['7', '8']);
    });
  });

  describe('findAllByUser', () => {
    it('only queries discoveries stored on the personal map', async () => {
      await service.findAllByUser('1');

      expect(statement()).toContain('d.user_id = $1');
      expect(statement()).toContain('d.is_personal');
      expect(params()).toEqual(['1']);
    });

    it('maps the stored country_code onto each discovery', async () => {
      query.mockResolvedValueOnce([
        row(),
        row({ id: '10', country_code: null }),
      ]);

      const discoveries = await service.findAllByUser('1');

      expect(discoveries.map((d) => d.countryCode)).toEqual(['ITA', null]);
    });
  });

  describe('findAllAuthoredByUser', () => {
    it('queries every discovery authored by the user without a map filter', async () => {
      await service.findAllAuthoredByUser('1');

      expect(statement()).toContain('WHERE d.user_id = $1');
      expect(statement()).not.toContain('AND d.is_personal');
      expect(statement()).not.toContain('WHERE EXISTS');
      expect(params()).toEqual(['1']);
    });

    it('returns personal and group-only discoveries together', async () => {
      query.mockResolvedValueOnce([
        row(),
        row({
          id: '10',
          group_id: '7',
          group_ids: ['7'],
          is_personal: false,
        }),
      ]);

      const discoveries = await service.findAllAuthoredByUser('1');

      expect(discoveries.map((discovery) => discovery.id)).toEqual(['9', '10']);
      expect(discoveries[1]).toMatchObject({
        groupIds: ['7'],
        personal: false,
      });
    });
  });

  describe('findAllFromUserGroups', () => {
    it('loads every discovery visible through the user group memberships', async () => {
      await service.findAllFromUserGroups('1');

      expect(statement()).toContain('FROM discovery_groups dg');
      expect(statement()).toContain(
        'INNER JOIN group_members gm ON gm.group_id = dg.group_id',
      );
      expect(statement()).toContain('gm.user_id = $1');
      expect(params()).toEqual(['1']);
    });

    it('maps discoveries from other group members', async () => {
      query.mockResolvedValueOnce([
        row({ id: '10', user_id: '2', author_user_name: 'Alex' }),
      ]);

      const discoveries = await service.findAllFromUserGroups('1');

      expect(discoveries).toHaveLength(1);
      expect(discoveries[0]).toMatchObject({
        id: '10',
        userId: '2',
        authorUserName: 'Alex',
      });
    });
  });

  describe('findAllByGroup', () => {
    it('loads discoveries explicitly linked to the requested group', async () => {
      await service.findAllByGroup('7');

      expect(statement()).toContain('FROM discovery_groups dg');
      expect(statement()).toContain('dg.group_id = $1');
      expect(params()).toEqual(['7']);
    });
  });

  describe('findOneByUser', () => {
    it('returns the stored country_code', async () => {
      query.mockResolvedValueOnce([row()]);

      const discovery = await service.findOneByUser('9', '1');

      expect(discovery.countryCode).toBe('ITA');
    });

    it('throws when the discovery does not exist', async () => {
      query.mockResolvedValueOnce([]);

      await expect(service.findOneByUser('9', '1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('recomputes the country when coordinates move', async () => {
      query.mockResolvedValueOnce([
        row({ longitude: '2.35', latitude: '48.85' }),
      ]);

      await service.update('9', '1', { longitude: 2.35, latitude: 48.85 });

      expect(statement()).toContain('matched_country');
      expect(statement()).toContain('point_geom');
      expect(params()).toEqual([
        '9',
        '1',
        null,
        false,
        null,
        null,
        2.35,
        48.85,
        false,
        [],
        false,
        false,
        true,
      ]);
    });

    it('keeps the coordinates (and so the derived country) when neither is sent', async () => {
      query.mockResolvedValueOnce([row()]);

      await service.update('9', '1', { title: 'Renamed' });

      expect(params()).toEqual([
        '9',
        '1',
        'Renamed',
        false,
        null,
        null,
        null,
        null,
        false,
        [],
        false,
        false,
        false,
      ]);
    });

    it('throws when the discovery does not exist', async () => {
      query.mockResolvedValueOnce([]);

      await expect(
        service.update('9', '1', { title: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('validates and replaces group shares, including the original one', async () => {
      query
        .mockResolvedValueOnce([row({ group_id: '7', group_ids: ['7', '8'] })])
        .mockResolvedValueOnce([row({ group_id: '7', group_ids: ['9'] })]);

      const discovery = await service.update('9', '1', { groupIds: ['9'] });

      expect(requireMembership).toHaveBeenCalledWith('1', '9');
      expect(query.mock.calls[1][1]?.slice(8, 10)).toEqual([true, ['9']]);
      expect(discovery.groupIds).toEqual(['9']);
    });

    it('updates personal-map visibility independently from group shares', async () => {
      query
        .mockResolvedValueOnce([row({ group_ids: ['7'] })])
        .mockResolvedValueOnce([row({ is_personal: false })]);

      const discovery = await service.update('9', '1', { personal: false });

      expect(query.mock.calls[1][1]?.slice(-3, -1)).toEqual([true, false]);
      expect(discovery.personal).toBe(false);
    });

    it('does not allow every destination to be removed', async () => {
      query.mockResolvedValueOnce([row({ group_ids: [], is_personal: true })]);

      await expect(
        service.update('9', '1', { groupIds: [], personal: false }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('removes the stored photo after deleting the discovery row', async () => {
      query.mockResolvedValueOnce([
        { id: '9', image_object_key: 'photos/discovery.jpg' },
      ]);

      await service.remove('9', '1');

      // Scoped to the caller, so a row that somehow references another
      // account's key frees nothing rather than destroying their object.
      expect(removeOwnedPhoto).toHaveBeenCalledWith(
        '1',
        'photos/discovery.jpg',
      );
    });

    it('keeps deletion successful when post-delete photo cleanup fails', async () => {
      const cleanupError = new Error('MinIO unavailable');
      query.mockResolvedValueOnce([
        { id: '9', image_object_key: 'photos/discovery.jpg' },
      ]);
      removeOwnedPhoto.mockRejectedValueOnce(cleanupError);
      const loggerError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      await expect(service.remove('9', '1')).resolves.toBeUndefined();

      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('photos/discovery.jpg'),
        cleanupError.stack,
      );
    });

    it('throws when nothing was deleted', async () => {
      query.mockResolvedValueOnce([]);

      await expect(service.remove('9', '1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
