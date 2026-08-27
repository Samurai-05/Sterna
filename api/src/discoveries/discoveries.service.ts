import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupsService } from '../groups/groups.service';
import { CreateDiscoveryDto } from './create-discovery.dto';
import { Discovery } from './discovery.entity';
import { UpdateDiscoveryDto } from './update-discovery.dto';

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
  /** Display name of the author (FR-31), so a group map can label its markers. */
  authorUserName: string;
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
  author_user_name: string;
  discovered_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * The columns every read below returns, spelled once.
 *
 * The join to `users` is what puts the author's name on a discovery (FR-31);
 * it is an inner join because discoveries.user_id is NOT NULL with an ON
 * DELETE CASCADE behind it, so a row without an author cannot exist.
 */
const DISCOVERY_PROJECTION = `
  SELECT
    d.id,
    d.user_id,
    d.group_id,
    d.title,
    d.description,
    d.category,
    ST_X(d.location) AS longitude,
    ST_Y(d.location) AS latitude,
    d.image_object_key,
    u.user_name AS author_user_name,
    d.discovered_at,
    d.created_at,
    d.updated_at
  FROM discoveries d
  JOIN users u ON u.id = d.user_id
`;

@Injectable()
export class DiscoveriesService {
  constructor(
    @InjectRepository(Discovery)
    private readonly discoveries: Repository<Discovery>,
    private readonly groups: GroupsService,
  ) {}

  /**
   * The caller's personal map.
   *
   * Filtered on user_id alone, deliberately: a discovery the caller recorded
   * in a group belongs to that group's shared map *and* stays on its author's
   * own map. Nobody else's discoveries appear here, group-mates included
   * (NFR-24).
   */
  async findAllByUser(userId: string): Promise<DiscoveryResponse[]> {
    const rows = await this.discoveries.query<DiscoveryRow[]>(
      `
      ${DISCOVERY_PROJECTION}
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC, d.id DESC
    `,
      [userId],
    );

    return rows.map((row) => this.toResponse(row));
  }

  /**
   * A group's shared map: every member's discoveries in it, each carrying its
   * author (FR-29, FR-31).
   *
   * Takes no user id — the caller's membership is established before this is
   * reached, by GroupDiscoveriesController.
   */
  async findAllByGroup(groupId: string): Promise<DiscoveryResponse[]> {
    const rows = await this.discoveries.query<DiscoveryRow[]>(
      `
      ${DISCOVERY_PROJECTION}
      WHERE d.group_id = $1
      ORDER BY d.created_at DESC, d.id DESC
    `,
      [groupId],
    );

    return rows.map((row) => this.toResponse(row));
  }

  async create(
    userId: string,
    dto: CreateDiscoveryDto,
  ): Promise<DiscoveryResponse> {
    if (dto.groupId) {
      // fk_discoveries_group_membership would catch this too, but as a raw
      // constraint violation — a 500 telling the client nothing. Checking here
      // makes a discovery aimed at someone else's group the same 404 as every
      // other way of touching it (NFR-19, NFR-25).
      await this.groups.requireMembership(userId, dto.groupId);
    }

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
          (SELECT user_name FROM users
            WHERE users.id = discoveries.user_id) AS author_user_name,
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

  async findOneByUser(id: string, userId: string): Promise<DiscoveryResponse> {
    const [row] = await this.discoveries.query<DiscoveryRow[]>(
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
        WHERE id = $1 AND user_id = $2
      `,
      [id, userId],
    );

    return this.toResponse(this.requireRow(row));
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateDiscoveryDto,
  ): Promise<DiscoveryResponse> {
    const [row] = await this.discoveries.query<DiscoveryRow[]>(
      `
        WITH updated AS (
          UPDATE discoveries
          SET
            title = COALESCE($3, title),
            description = CASE WHEN $4::boolean THEN $5 ELSE description END,
            category = COALESCE($6, category),
            location = ST_SetSRID(
              ST_MakePoint(
                COALESCE($7, ST_X(location)),
                COALESCE($8, ST_Y(location))
              ),
              4326
            )
          WHERE id = $1 AND user_id = $2
          RETURNING *
        )
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
        FROM updated
      `,
      [
        id,
        userId,
        dto.title ?? null,
        Object.prototype.hasOwnProperty.call(dto, 'description'),
        dto.description ?? null,
        dto.category ?? null,
        dto.longitude ?? null,
        dto.latitude ?? null,
      ],
    );

    return this.toResponse(this.requireRow(row));
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.discoveries.query<Array<{ id: string }>>(
      `
        WITH deleted AS (
          DELETE FROM discoveries
          WHERE id = $1 AND user_id = $2
          RETURNING id
        )
        SELECT id FROM deleted
      `,
      [id, userId],
    );

    if (!result[0]) {
      throw new NotFoundException('Discovery not found.');
    }
  }

  private requireRow(row: DiscoveryRow | undefined): DiscoveryRow {
    if (!row) {
      throw new NotFoundException('Discovery not found.');
    }

    return row;
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
      authorUserName: row.author_user_name,
      discoveredAt: discoveredAt.toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
}
