import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiscoveriesService } from './discoveries.service';
import { Discovery } from './discovery.entity';
import { GroupsService } from '../groups/groups.service';

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

  let service: DiscoveriesService;

  const statement = (): string =>
    query.mock.calls[0][0].replace(/\s+/g, ' ').trim();

  const params = (): unknown[] | undefined => query.mock.calls[0][1];

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: '9',
    user_id: '1',
    group_id: null,
    title: 'Phi Beach',
    description: null,
    category: 'Other',
    longitude: '9.4669802',
    latitude: '41.1418826',
    image_object_key: 'discoveries/phi-beach.jpg',
    author_user_name: 'Ada',
    country_code: 'ITA',
    discovered_at: new Date('2026-08-06T20:31:19.000Z'),
    created_at: new Date('2026-08-27T11:44:41.142Z'),
    updated_at: new Date('2026-08-27T11:44:41.142Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    query.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        DiscoveriesService,
        { provide: getRepositoryToken(Discovery), useValue: { query } },
        { provide: GroupsService, useValue: { requireMembership } },
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
      imageObjectKey: 'discoveries/phi-beach.jpg',
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
        dto.discoveredAt,
      ]);
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
  });

  describe('findAllByUser', () => {
    it('maps the stored country_code onto each discovery', async () => {
      query.mockResolvedValueOnce([
        row(),
        row({ id: '10', country_code: null }),
      ]);

      const discoveries = await service.findAllByUser('1');

      expect(discoveries.map((d) => d.countryCode)).toEqual(['ITA', null]);
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
      ]);
    });

    it('throws when the discovery does not exist', async () => {
      query.mockResolvedValueOnce([]);

      await expect(
        service.update('9', '1', { title: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws when nothing was deleted', async () => {
      query.mockResolvedValueOnce([]);

      await expect(service.remove('9', '1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
