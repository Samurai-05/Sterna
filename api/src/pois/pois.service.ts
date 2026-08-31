import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poi } from './poi.entity';

export interface PoiResponse {
  id: string;
  title: string;
  description: string | null;
  longitude: number;
  latitude: number;
  imageUrl: string | null;
  discovered: boolean;
}

interface PoiRow {
  id: string;
  title: string;
  description: string | null;
  longitude: string;
  latitude: string;
  image_url: string | null;
  discovered: boolean;
}

export const POI_DISCOVERY_RADIUS_METERS = 150;

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
          poi.image_url,
          EXISTS (
            SELECT 1
            FROM discoveries discovery
            WHERE ST_DWithin(
              poi.location::geography,
              discovery.location::geography,
              $2
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
      imageUrl: row.image_url,
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
          poi.image_url,
          EXISTS (
            SELECT 1
            FROM discoveries discovery
            WHERE discovery.user_id = $1
              AND ST_DWithin(
                poi.location::geography,
                discovery.location::geography,
                $2
              )
          ) AS discovered
        FROM pois poi
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
      imageUrl: row.image_url,
      discovered: row.discovered,
    }));
  }
}
