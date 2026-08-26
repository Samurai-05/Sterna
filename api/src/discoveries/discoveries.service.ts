import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDiscoveryDto } from './create-discovery.dto';
import { Discovery } from './discovery.entity';

export interface DiscoveryResponse {
  id: string;
  userId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  longitude: number;
  latitude: number;
  imageObjectKey: string;
  discoveredAt: string;
  createdAt: string;
  updatedAt: string;
}

interface DiscoveryRow {
  id: string;
  user_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  longitude: string;
  latitude: string;
  image_object_key: string;
  discovered_at: Date;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class DiscoveriesService {
  constructor(
    @InjectRepository(Discovery)
    private readonly discoveries: Repository<Discovery>,
  ) {}

  async findAllByUser(userId: string): Promise<DiscoveryResponse[]> {
    const rows = await this.discoveries.query<DiscoveryRow[]>(
      `
      SELECT
        id,
        user_id,
        group_id,
        title,
        description,
        category,
        ST_X(location) AS longitude,
        ST_Y(location) AS latitude,
        image_object_key,
        discovered_at,
        created_at,
        updated_at
      FROM discoveries
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `,
      [userId],
    );

    return rows.map((row) => this.toResponse(row));
  }

  async create(
    userId: string,
    dto: CreateDiscoveryDto,
  ): Promise<DiscoveryResponse> {
    const [row] = await this.discoveries.query<DiscoveryRow[]>(
      `
        INSERT INTO discoveries (
          user_id,
          group_id,
          title,
          description,
          category,
          location,
          image_object_key,
          discovered_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326),
          $8,
          $9
        )
        RETURNING
          id,
          user_id,
          group_id,
          title,
          description,
          category,
          ST_X(location) AS longitude,
          ST_Y(location) AS latitude,
          image_object_key,
          discovered_at,
          created_at,
          updated_at
      `,
      [
        userId,
        dto.groupId ?? null,
        dto.title,
        dto.description ?? null,
        dto.category ?? null,
        dto.longitude,
        dto.latitude,
        dto.imageObjectKey,
        dto.discoveredAt,
      ],
    );

    return this.toResponse(row);
  }

  private toResponse(row: DiscoveryRow): DiscoveryResponse {
    const discoveredAt = new Date(row.discovered_at);
    const createdAt = new Date(row.created_at);
    const updatedAt = new Date(row.updated_at);

    return {
      id: row.id,
      userId: row.user_id,
      groupId: row.group_id,
      title: row.title,
      description: row.description,
      category: row.category,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      imageObjectKey: row.image_object_key,
      discoveredAt: discoveredAt.toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
}
