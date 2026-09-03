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
