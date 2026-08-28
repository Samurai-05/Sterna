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
  /**
   * ISO 3166-1 alpha-3, from PostGIS containment against `countries` (issue
   * #59 / ADR-005). Null when the point is genuinely nowhere near any country
   * — open ocean, past COUNTRY_MATCH_BUFFER_METERS from every coastline.
   */
  countryCode: string | null;
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
  country_code: string | null;
  discovered_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Metres a point may fall outside every country polygon and still be
 * assigned the nearest one.
 *
 * `countries` is seeded from the same simplified ~1.5MB boundary dataset the
 * map's veil layer renders (see migration 1787734648000), so a discovery
 * pinned right at a coastline can land just outside the real polygon even
 * though it is clearly on land — a resolution limit of the dataset, not of
 * ST_Contains. Bare ST_Contains would leave such a discovery countryless
 * (and its country permanently shown unexplored), so COUNTRY_LOOKUP_CTE falls
 * back to the nearest country within this buffer. 5km comfortably covers
 * that simplification error without snapping a genuinely open-ocean point to
 * whatever coastline happens to be closest.
 */
const COUNTRY_MATCH_BUFFER_METERS = 5000;

/**
 * Expects a `point_geom(geom)` CTE already in scope and appends
 * `matched_country(a3)`, the nearest/containing country for that point.
 *
 * ST_Contains is checked first (ORDER BY ... DESC): an island whose nearest
 * polygon vertex is still further than a coastal mainland point should not
 * lose to it on raw distance.
 */
const COUNTRY_LOOKUP_CTE = `
  matched_country AS (
    SELECT c.a3
    FROM countries c, point_geom p
    WHERE ST_Contains(c.geom, p.geom)
       OR ST_DWithin(c.geom::geography, p.geom::geography, ${COUNTRY_MATCH_BUFFER_METERS})
    ORDER BY ST_Contains(c.geom, p.geom) DESC, c.geom <-> p.geom
    LIMIT 1
  )
`;

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
    d.country_code,
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
   * A personal discovery is identified by the absence of a group. Filtering
   * on both ownership and group_id prevents discoveries recorded in a group
   * from leaking onto their author's personal map.
   */
  async findAllByUser(userId: string): Promise<DiscoveryResponse[]> {
    const rows = await this.discoveries.query<DiscoveryRow[]>(
      `
      ${DISCOVERY_PROJECTION}
      WHERE d.user_id = $1
        AND d.group_id IS NULL
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
        WITH point_geom AS (
          SELECT ST_SetSRID(ST_MakePoint($6, $7), 4326) AS geom
        ),
        ${COUNTRY_LOOKUP_CTE}
        INSERT INTO discoveries (
          user_id,
          group_id,
          title,
          description,
          category,
          location,
          image_object_key,
          discovered_at,
          country_code
        )
        SELECT
          $1, $2, $3, $4, $5, point_geom.geom, $8, $9, matched_country.a3
        FROM point_geom
        LEFT JOIN matched_country ON true
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
          country_code,
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
          country_code,
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
        WITH point_geom AS (
          SELECT ST_SetSRID(
            ST_MakePoint(
              COALESCE($7, ST_X(location)),
              COALESCE($8, ST_Y(location))
            ),
            4326
          ) AS geom
          FROM discoveries
          WHERE id = $1 AND user_id = $2
        ),
        ${COUNTRY_LOOKUP_CTE},
        updated AS (
          UPDATE discoveries d
          SET
            title = COALESCE($3, d.title),
            description = CASE WHEN $4::boolean THEN $5 ELSE d.description END,
            category = COALESCE($6, d.category),
            location = point_geom.geom,
            country_code = (SELECT a3 FROM matched_country)
          FROM point_geom
          WHERE d.id = $1 AND d.user_id = $2
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
          country_code,
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
      countryCode: row.country_code,
      discoveredAt: discoveredAt.toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
}
