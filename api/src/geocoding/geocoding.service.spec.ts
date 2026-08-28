import { ServiceUnavailableException } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService();
    jest.restoreAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  it('maps a Nominatim city and sends an identifying user agent', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            place_id: 1,
            osm_type: 'relation',
            osm_id: 1688687,
            display_name: 'Lausanne, Vaud, Suisse',
            lat: '46.5218',
            lon: '6.6327',
            addresstype: 'city',
          },
        ]),
        { status: 200 },
      ),
    );

    await expect(service.search('Lausanne')).resolves.toEqual([
      {
        id: 'relation:1688687',
        label: 'Lausanne, Vaud, Suisse',
        type: 'city',
        longitude: 6.6327,
        latitude: 46.5218,
        zoom: 12,
      },
    ]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).searchParams.get('q')).toBe('Lausanne');
    const headers = new Headers(options?.headers);
    expect(headers.get('User-Agent')).toContain('Sterna');
    expect(headers.get('Accept-Language')).toBe('en');
  });

  it('caches identical searches', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));

    await service.search('Bern');
    await service.search('bern');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns an upstream failure into a service-unavailable response', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('offline'));

    await expect(service.search('Geneva')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
