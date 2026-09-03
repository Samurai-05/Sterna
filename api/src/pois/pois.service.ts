import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { Repository } from 'typeorm';
import { Poi } from './poi.entity';
import { poiConfirmSearchRadiusMeters } from './poi-search-radius';

export interface PoiResponse {
  id: string;
  title: string;
  description: string | null;
  longitude: number;
  latitude: number;
  countryCode: string | null;
  imageUrl: string | null;
  discovered: boolean;
}

interface PoiRow {
  id: string;
  title: string;
  description: string | null;
  longitude: string;
  latitude: string;
  country_code: string | null;
  image_url: string | null;
  discovered: boolean;
}

interface PoiNearbyRow extends PoiRow {
  distance_meters: string;
}

export const POI_DISCOVERY_RADIUS_METERS = 150;
const COUNTRY_MATCH_BUFFER_METERS = 5000;

// "Nearby" candidates for the confirm-to-unlock flow (PoisController.nearby):
// far more generous than POI_DISCOVERY_RADIUS_METERS on purpose. A landmark
// is often photographed from well outside auto-unlock range — the Matterhorn
// from Zermatt town, the Eiffel Tower from Trocadéro — but unlike the
// automatic radius, a candidate here is never unlocked on its own; the user
// still has to explicitly confirm which one (if any) they mean, which is
// what makes a wide radius safe here where it wasn't for the automatic check.
// The real precision comes from poiConfirmSearchRadiusMeters (category-based,
// applied in findNearby) — these two just bound how far the SQL scan looks,
// so the default matches the max rather than artificially excluding distant
// mountain-tier candidates the category filter would otherwise allow.
export const POI_NEARBY_DEFAULT_RADIUS_METERS = 20000;
export const POI_NEARBY_MAX_RADIUS_METERS = 20000;

export interface PoiImage {
  stream: Readable;
  contentType: string;
}

// The client's own network may not be able to reach Wikimedia directly (the
// app is often used over a locked-down campus/lab network that only allows
// this server's own domain) — this server always can, so POI photos are
// fetched here and re-served same-origin rather than linked to directly.
// poi.catalog.ts only ever populates image_url with one of these two hosts;
// this is checked again regardless, so a proxy request can never be turned
// into a fetch of an arbitrary URL even if that ever stopped being true.
const ALLOWED_POI_IMAGE_HOSTS = new Set([
  'commons.wikimedia.org',
  'upload.wikimedia.org',
]);
const POI_IMAGE_USER_AGENT =
  'Sterna/1.0 (+https://github.com/Samurai-05/Sterna)';
const POI_IMAGE_FETCH_TIMEOUT_MS = 8000;
const POI_IMAGE_DEFAULT_WIDTH = 800;
const POI_IMAGE_MIN_WIDTH = 64;
const POI_IMAGE_MAX_WIDTH = 2000;

/** Same-origin path PoiResponse.imageUrl points to instead of the raw
 * Wikimedia URL — see the comment on ALLOWED_POI_IMAGE_HOSTS above. */
export function poiImageProxyPath(id: string): string {
  return `/api/pois/${id}/image`;
}

function clampImageWidth(requested: number | undefined): number {
  if (!requested || !Number.isFinite(requested)) {
    return POI_IMAGE_DEFAULT_WIDTH;
  }
  return Math.min(
    POI_IMAGE_MAX_WIDTH,
    Math.max(POI_IMAGE_MIN_WIDTH, Math.round(requested)),
  );
}

// Split into two lookups rather than one OR'd WHERE clause: an OR across
// ST_Contains (backed by idx_countries_geom) and a geography-cast
// ST_DWithin (backed by idx_countries_geom_geography) stops Postgres from
// using either index, forcing a sequential scan of `countries` per POI.
// Run separately, each half uses its own index — the fallback only runs
// for the POIs the first lookup doesn't resolve.
const POI_COUNTRY_PROJECTION = `
  COALESCE(
    (
      SELECT country.a3
      FROM countries country
      WHERE ST_Contains(country.geom, poi.location)
      LIMIT 1
    ),
    (
      SELECT country.a3
      FROM countries country
      WHERE ST_DWithin(
        country.geom::geography,
        poi.location::geography,
        ${COUNTRY_MATCH_BUFFER_METERS}
      )
      ORDER BY country.geom <-> poi.location
      LIMIT 1
    )
  ) AS country_code
`;

@Injectable()
export class PoisService {
  constructor(
    @InjectRepository(Poi)
    private readonly pois: Repository<Poi>,
  ) {}

  async findAll(userId: string): Promise<PoiResponse[]> {
    const rows = await this.pois.query<PoiRow[]>(
      `
        SELECT
          poi.id,
          poi.title,
          poi.description,
          ST_X(poi.location) AS longitude,
          ST_Y(poi.location) AS latitude,
          ${POI_COUNTRY_PROJECTION},
          poi.image_url,
          EXISTS (
            SELECT 1
            FROM discoveries discovery
            WHERE (
              ST_DWithin(
                poi.location::geography,
                discovery.location::geography,
                $2
              )
              OR discovery.confirmed_poi_id = poi.id
            )
            AND (
              (
                active_map.group_id IS NULL
                AND discovery.user_id = $1
                AND discovery.is_personal
              )
              OR EXISTS (
                SELECT 1
                FROM discovery_groups discovery_group
                WHERE discovery_group.discovery_id = discovery.id
                  AND discovery_group.group_id = active_map.group_id
              )
            )
          ) AS discovered
        FROM pois poi
        LEFT JOIN LATERAL (
          SELECT member.group_id
          FROM group_members member
          WHERE member.user_id = $1 AND member.is_active = TRUE
          LIMIT 1
        ) active_map ON TRUE
        WHERE poi.is_active
        ORDER BY poi.title ASC
      `,
      [userId, POI_DISCOVERY_RADIUS_METERS],
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      countryCode: row.country_code,
      imageUrl: row.image_url ? poiImageProxyPath(row.id) : null,
      discovered: row.discovered,
    }));
  }

  async findAllAuthoredByUser(userId: string): Promise<PoiResponse[]> {
    const rows = await this.pois.query<PoiRow[]>(
      `
        SELECT
          poi.id,
          poi.title,
          poi.description,
          ST_X(poi.location) AS longitude,
          ST_Y(poi.location) AS latitude,
          ${POI_COUNTRY_PROJECTION},
          poi.image_url,
          EXISTS (
            SELECT 1
            FROM discoveries discovery
            WHERE discovery.user_id = $1
              AND (
                ST_DWithin(
                  poi.location::geography,
                  discovery.location::geography,
                  $2
                )
                OR discovery.confirmed_poi_id = poi.id
              )
          ) AS discovered
        FROM pois poi
        WHERE poi.is_active
        ORDER BY poi.title ASC
      `,
      [userId, POI_DISCOVERY_RADIUS_METERS],
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      countryCode: row.country_code,
      imageUrl: row.image_url ? poiImageProxyPath(row.id) : null,
      discovered: row.discovered,
    }));
  }

  /**
   * Candidates for the confirm-to-unlock flow (a discovery is often saved,
   * or a POI page visited, well outside POI_DISCOVERY_RADIUS_METERS),
   * closest first. `radiusMeters` bounds the SQL scan (and lets a caller ask
   * for something tighter), but the real cutoff per POI is narrower and
   * category-dependent — see poiConfirmSearchRadiusMeters — so a photo taken
   * in the middle of a city doesn't match every monument in it, while a
   * mountain summit still matches from several kilometres away.
   * `discovered` is computed exactly as in findAll, so an already-confirmed
   * candidate can be filtered out client-side rather than re-offered.
   */
  async findNearby(
    userId: string,
    longitude: number,
    latitude: number,
    radiusMeters: number,
  ): Promise<PoiResponse[]> {
    const rows = await this.pois.query<PoiNearbyRow[]>(
      `
        SELECT
          poi.id,
          poi.title,
          poi.description,
          ST_X(poi.location) AS longitude,
          ST_Y(poi.location) AS latitude,
          ${POI_COUNTRY_PROJECTION},
          poi.image_url,
          ST_Distance(
            poi.location::geography,
            ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
          ) AS distance_meters,
          EXISTS (
            SELECT 1
            FROM discoveries discovery
            WHERE discovery.user_id = $1
              AND (
                ST_DWithin(
                  poi.location::geography,
                  discovery.location::geography,
                  $5
                )
                OR discovery.confirmed_poi_id = poi.id
              )
          ) AS discovered
        FROM pois poi
        WHERE poi.is_active
          AND ST_DWithin(
          poi.location::geography,
          ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
          $4
        )
        ORDER BY poi.location <-> ST_SetSRID(ST_MakePoint($2, $3), 4326)
      `,
      [userId, longitude, latitude, radiusMeters, POI_DISCOVERY_RADIUS_METERS],
    );

    return rows
      .filter(
        (row) =>
          Number(row.distance_meters) <=
          Math.min(poiConfirmSearchRadiusMeters(row.description), radiusMeters),
      )
      .map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        longitude: Number(row.longitude),
        latitude: Number(row.latitude),
        countryCode: row.country_code,
        imageUrl: row.image_url ? poiImageProxyPath(row.id) : null,
        discovered: row.discovered,
      }));
  }

  /** Throws NotFoundException rather than letting a bogus id surface as a
   * raw FK-violation 500 from wherever it's ultimately written (e.g.
   * DiscoveriesService.update confirming a discovery against it). */
  async requireExists(id: string): Promise<void> {
    const [row] = await this.pois.query<{ exists: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM pois WHERE id = $1 AND is_active)`,
      [id],
    );
    if (!row?.exists) {
      throw new NotFoundException(`No such point of interest "${id}".`);
    }
  }

  /**
   * Fetches the POI's photo from Wikimedia and hands back a stream for the
   * controller to pipe out — see the comment on ALLOWED_POI_IMAGE_HOSTS
   * above for why this exists instead of the client loading it directly.
   */
  async getImage(id: string, requestedWidth?: number): Promise<PoiImage> {
    const poi = await this.pois.findOne({
      where: { id, isActive: true },
      select: { imageUrl: true },
    });
    if (!poi?.imageUrl) {
      throw new NotFoundException(`No image for POI "${id}".`);
    }

    const target = new URL(poi.imageUrl);
    if (!ALLOWED_POI_IMAGE_HOSTS.has(target.hostname)) {
      throw new BadGatewayException('POI image source is not an allowed host.');
    }
    target.searchParams.set('width', String(clampImageWidth(requestedWidth)));

    let response: Response;
    try {
      response = await fetch(target, {
        headers: { 'User-Agent': POI_IMAGE_USER_AGENT },
        signal: AbortSignal.timeout(POI_IMAGE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        'POI image is temporarily unavailable.',
        { cause: error },
      );
    }

    if (!response.ok || !response.body) {
      throw new ServiceUnavailableException(
        'POI image is temporarily unavailable.',
      );
    }

    return {
      stream: Readable.fromWeb(
        response.body as unknown as NodeWebReadableStream,
      ),
      contentType: response.headers.get('content-type') ?? 'image/jpeg',
    };
  }
}
