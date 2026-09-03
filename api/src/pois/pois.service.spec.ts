import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Poi } from './poi.entity';
import { PoisService } from './pois.service';

describe('PoisService', () => {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  const findOne = jest.fn();
  let service: PoisService;

  beforeEach(async () => {
    query.mockReset();
    query.mockResolvedValue([]);
    findOne.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        PoisService,
        {
          provide: getRepositoryToken(Poi),
          useValue: { query, findOne },
        },
      ],
    }).compile();

    service = module.get(PoisService);
  });

  it.each([
    ['active map', () => service.findAll('1')],
    ['authored collection', () => service.findAllAuthoredByUser('1')],
  ])('resolves the POI country for the %s response', async (_, load) => {
    await load();

    const statement = query.mock.calls[0][0];
    expect(statement).toContain('FROM countries country');
    expect(statement).toContain('AS country_code');
    expect(statement).toContain('ST_Contains(country.geom, poi.location)');
  });

  it.each([
    ['active map', () => service.findAll('1')],
    ['authored collection', () => service.findAllAuthoredByUser('1')],
  ])(
    'treats an explicit confirmed-POI link as discovered for the %s response',
    async (_, load) => {
      await load();

      const statement = query.mock.calls[0][0];
      // The confirmed-link check must be parenthesized alongside the
      // proximity check, not OR'd onto the end of the whole WHERE clause —
      // otherwise it would bypass the ownership/active-map scoping entirely.
      expect(statement).toMatch(
        /\(\s*ST_DWithin\([\s\S]*?\)\s*OR\s+discovery\.confirmed_poi_id\s*=\s*poi\.id\s*\)/,
      );
    },
  );

  it('maps the resolved country code', async () => {
    query.mockResolvedValueOnce([
      {
        id: '1',
        title: 'Eiffel Tower',
        description: null,
        longitude: '2.2945',
        latitude: '48.8584',
        country_code: 'FRA',
        image_url: null,
        discovered: true,
      },
    ]);

    const [poi] = await service.findAll('1');

    expect(poi).toMatchObject({
      id: '1',
      countryCode: 'FRA',
      longitude: 2.2945,
      latitude: 48.8584,
    });
  });

  it('points imageUrl at the same-origin proxy path rather than Wikimedia', async () => {
    query.mockResolvedValueOnce([
      {
        id: '42',
        title: 'Somewhere',
        description: null,
        longitude: '1',
        latitude: '2',
        country_code: null,
        image_url:
          'https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg',
        discovered: false,
      },
    ]);

    const [poi] = await service.findAll('1');

    expect(poi.imageUrl).toBe('/api/pois/42/image');
  });

  it('leaves imageUrl null when the POI has none', async () => {
    query.mockResolvedValueOnce([
      {
        id: '42',
        title: 'Somewhere',
        description: null,
        longitude: '1',
        latitude: '2',
        country_code: null,
        image_url: null,
        discovered: false,
      },
    ]);

    const [poi] = await service.findAll('1');

    expect(poi.imageUrl).toBeNull();
  });

  describe('findNearby', () => {
    it('filters by distance from the given point and orders nearest first', async () => {
      await service.findNearby('1', 2.2865, 48.862, 2000);

      const [statement, params] = query.mock.calls[0];
      expect(statement).toContain('ST_DWithin(');
      expect(statement).toContain('ST_Distance(');
      expect(statement).toContain('ST_SetSRID(ST_MakePoint($2, $3), 4326)');
      expect(statement).toContain(
        'ORDER BY poi.location <-> ST_SetSRID(ST_MakePoint($2, $3), 4326)',
      );
      expect(params).toEqual(['1', 2.2865, 48.862, 2000, 150]);
    });

    it('maps results the same way as findAll', async () => {
      query.mockResolvedValueOnce([
        {
          id: '42',
          title: 'Somewhere',
          description: null,
          longitude: '2.29',
          latitude: '48.86',
          country_code: 'FRA',
          image_url: null,
          distance_meters: '500',
          discovered: false,
        },
      ]);

      const [poi] = await service.findNearby('1', 2.29, 48.86, 5000);

      expect(poi).toMatchObject({
        id: '42',
        title: 'Somewhere',
        countryCode: 'FRA',
        discovered: false,
      });
    });

    it('excludes a close-range POI (e.g. a museum) once it is beyond its own category radius', async () => {
      query.mockResolvedValueOnce([
        {
          id: '1',
          title: 'A Museum',
          description:
            'Its collections bring together objects and stories that make the country’s history and creativity easier to understand.',
          longitude: '2.29',
          latitude: '48.86',
          country_code: 'FRA',
          image_url: null,
          distance_meters: '1500', // beyond the museum category's 1km radius
          discovered: false,
        },
      ]);

      const results = await service.findNearby('1', 2.29, 48.86, 20000);

      expect(results).toHaveLength(0);
    });

    it('keeps a far-range POI (e.g. a mountain) within its wider category radius', async () => {
      query.mockResolvedValueOnce([
        {
          id: '2',
          title: 'A Mountain',
          description:
            'Its scenery and ecosystems showcase a distinctive part of the country’s natural heritage.',
          longitude: '7.6586',
          latitude: '45.9764',
          country_code: 'CHE',
          image_url: null,
          distance_meters: '8500', // within the natural-feature category's 20km radius
          discovered: false,
        },
      ]);

      const results = await service.findNearby('1', 7.7491, 46.0207, 20000);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('never returns a candidate beyond the caller-supplied radius even when its category radius is wider', async () => {
      query.mockResolvedValueOnce([
        {
          id: '2',
          title: 'A Mountain',
          description:
            'Its scenery and ecosystems showcase a distinctive part of the country’s natural heritage.',
          longitude: '7.6586',
          latitude: '45.9764',
          country_code: 'CHE',
          image_url: null,
          distance_meters: '8500',
          discovered: false,
        },
      ]);

      const results = await service.findNearby('1', 7.7491, 46.0207, 5000);

      expect(results).toHaveLength(0);
    });
  });

  describe('requireExists', () => {
    it('resolves when the POI exists', async () => {
      query.mockResolvedValueOnce([{ exists: true }]);

      await expect(service.requireExists('1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when the POI does not exist', async () => {
      query.mockResolvedValueOnce([{ exists: false }]);

      await expect(service.requireExists('999999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getImage', () => {
    afterEach(() => jest.restoreAllMocks());

    it('fetches the POI photo from Wikimedia at the requested width and streams it back', async () => {
      findOne.mockResolvedValueOnce({
        imageUrl:
          'https://commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg',
      });
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response('fake-bytes', {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }),
      );

      const result = await service.getImage('42', 640);

      expect(result.contentType).toBe('image/jpeg');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] as [URL];
      expect(calledUrl.href).toContain(
        'commons.wikimedia.org/wiki/Special:Redirect/file/Example.jpg',
      );
      expect(calledUrl.href).toContain('width=640');
    });

    it('rejects an image host outside the Wikimedia allowlist without fetching it', async () => {
      findOne.mockResolvedValueOnce({
        imageUrl: 'https://evil.example.com/x.jpg',
      });
      const fetchMock = jest.spyOn(global, 'fetch');

      await expect(service.getImage('42')).rejects.toThrow(BadGatewayException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a POI with no image', async () => {
      findOne.mockResolvedValueOnce({ imageUrl: null });

      await expect(service.getImage('42')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for an unknown POI', async () => {
      findOne.mockResolvedValueOnce(null);

      await expect(service.getImage('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
