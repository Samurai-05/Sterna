import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface LocationSearchResult {
  id: string;
  label: string;
  type: string;
  longitude: number;
  latitude: number;
  zoom: number;
}

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  addresstype?: string;
  type?: string;
}

interface CacheEntry {
  expiresAt: number;
  results: LocationSearchResult[];
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1000;
const MAX_CACHE_ENTRIES = 100;

@Injectable()
export class GeocodingService {
  private readonly cache = new Map<string, CacheEntry>();
  private requestQueue: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;

  async search(query: string): Promise<LocationSearchResult[]> {
    const cacheKey = query.trim().toLocaleLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.results;
    }

    const results = await this.enqueueRequest(query.trim());
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      this.cache.delete(this.cache.keys().next().value as string);
    }
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      results,
    });
    return results;
  }

  private enqueueRequest(query: string): Promise<LocationSearchResult[]> {
    const result = this.requestQueue.then(async () => {
      const waitMs = Math.max(0, this.nextRequestAt - Date.now());
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      this.nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
      return this.fetchFromNominatim(query);
    });

    this.requestQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async fetchFromNominatim(
    query: string,
  ): Promise<LocationSearchResult[]> {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '8');

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent': 'Sterna/1.0 (+https://github.com/Samurai-05/Sterna)',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`Nominatim answered ${response.status}.`);
      }

      const places = (await response.json()) as NominatimResult[];
      return places.map((place) => ({
        id: `${place.osm_type}:${place.osm_id || place.place_id}`,
        label: place.display_name,
        type: place.addresstype ?? place.type ?? 'place',
        longitude: Number(place.lon),
        latitude: Number(place.lat),
        zoom: zoomForPlaceType(place.addresstype ?? place.type),
      }));
    } catch (error) {
      throw new ServiceUnavailableException(
        'Place search is temporarily unavailable.',
        { cause: error },
      );
    }
  }
}

function zoomForPlaceType(type: string | undefined): number {
  switch (type) {
    case 'country':
      return 5;
    case 'state':
    case 'region':
      return 7;
    case 'county':
      return 9;
    case 'city':
    case 'town':
    case 'village':
    case 'municipality':
      return 12;
    case 'suburb':
    case 'neighbourhood':
      return 14;
    default:
      return 16;
  }
}
