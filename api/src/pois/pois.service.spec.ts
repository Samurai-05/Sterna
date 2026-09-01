import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Poi } from './poi.entity';
import { PoisService } from './pois.service';

describe('PoisService', () => {
  const query = jest.fn<Promise<unknown[]>, [string, unknown[]]>();
  let service: PoisService;

  beforeEach(async () => {
    query.mockReset();
    query.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        PoisService,
        {
          provide: getRepositoryToken(Poi),
          useValue: { query },
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
});
