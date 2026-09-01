import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import * as exifr from 'exifr';
import { Client } from 'minio';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import { MINIO_CLIENT } from './minio.client';
import { Photo } from './photo.entity';

/** NFR-21: only these three formats, 10 MB maximum. */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const KEY_PREFIX = 'photos';

// read() is handed the bare filename; everything else the full key.
const FILENAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/**
 * The only shape store() ever produces, and therefore the only shape a
 * client-supplied key may have. Derived from FILENAME_PATTERN so the two
 * cannot drift.
 *
 * Exported because the DTOs that accept a key — CreateDiscoveryDto
 * .imageObjectKey and UpdateProfileDto.avatarObjectKey — have to reject a
 * malformed one before it ever reaches an ownership check.
 */
export const PHOTO_OBJECT_KEY_PATTERN = new RegExp(
  `^${KEY_PREFIX}/${FILENAME_PATTERN.source.slice(1)}`,
);

/**
 * The full key for a filename off the read route. The two halves are split
 * across the wire — GET /api/photos/:filename carries no prefix, while every
 * table stores the whole key — so the join has to happen somewhere; here,
 * rather than in a controller that would have to know KEY_PREFIX.
 *
 * A malformed filename simply produces a key nothing matches, which is the
 * 404 the caller was going to get from read() anyway.
 */
export function photoObjectKey(filename: string): string {
  return `${KEY_PREFIX}/${filename}`;
}

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  takenAt: string | null;
}

export interface StoredPhoto {
  objectKey: string;
  url: string;
  exif: PhotoLocation | null;
}

/**
 * Tells "this object does not exist" apart from "MinIO is broken". The SDK
 * reports the former as `NotFound` on a HEAD (statObject) and `NoSuchKey` on a
 * GET, where the 404 carries an XML body.
 */
function isObjectMissing(error: unknown): boolean {
  const code = (error as { code?: unknown }).code;

  return code === 'NotFound' || code === 'NoSuchKey';
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly bucket: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minio: Client,
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  /**
   * Reads the location out of the original bytes, then stores a re-encoded copy
   * that carries no metadata at all (NFR-27). Returns the object key that the
   * caller will later save in DISCOVERIES.image_object_key.
   *
   * The uploader is recorded alongside the key (ADR-006). Every later question
   * about the object — may this caller attach it, read it, delete it — is
   * answered from that row, because the key itself is not a secret: it is
   * handed to every member of a shared group map.
   */
  async store(userId: string, file: Express.Multer.File): Promise<StoredPhoto> {
    const exif = await this.readLocation(file.buffer);
    const { buffer, contentType, extension } = await this.normalize(
      file.buffer,
    );

    const filename = `${randomUUID()}.${extension}`;
    const objectKey = `${KEY_PREFIX}/${filename}`;

    await this.minio.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    // Written after the object exists, not before: a row pointing at a key
    // whose upload failed would pass the ownership check on POST
    // /api/discoveries and then fail the existence check, which is a
    // needlessly confusing way to report a broken upload.
    await this.photos.insert({
      objectKey,
      userId,
      contentType,
      byteSize: String(buffer.length),
    });

    return { objectKey, url: `/api/photos/${filename}`, exif };
  }

  /** Streams a stored photo back out. Used by the read endpoint. */
  async read(
    filename: string,
  ): Promise<{ stream: Readable; contentType: string; size: number }> {
    if (!FILENAME_PATTERN.test(filename)) {
      throw new NotFoundException(`Unknown photo "${filename}".`);
    }

    const objectKey = `${KEY_PREFIX}/${filename}`;

    try {
      const stat = await this.minio.statObject(this.bucket, objectKey);
      const stream = await this.minio.getObject(this.bucket, objectKey);
      // metaData is typed as `any`, so narrow rather than trust it.
      const contentType: unknown = stat.metaData['content-type'];

      return {
        stream,
        contentType:
          typeof contentType === 'string'
            ? contentType
            : 'application/octet-stream',
        size: stat.size,
      };
    } catch (error) {
      if (isObjectMissing(error)) {
        throw new NotFoundException(`Unknown photo "${filename}".`);
      }

      // A MinIO outage must surface as a 500, not as a cacheable 404.
      throw error;
    }
  }

  /**
   * NFR-32: POST /api/discoveries must refuse to create a discovery whose photo
   * does not exist. Checks the object itself, not the row — ownsPhoto() is the
   * metadata half, and DiscoveriesService.create() asks both.
   */
  async exists(objectKey: string): Promise<boolean> {
    try {
      await this.minio.statObject(this.bucket, objectKey);
      return true;
    } catch (error) {
      if (isObjectMissing(error)) {
        return false;
      }

      throw error;
    }
  }

  /** Whether this caller is the account that uploaded this object. */
  async ownsPhoto(userId: string, objectKey: string): Promise<boolean> {
    return this.photos.existsBy({ objectKey, userId });
  }

  /**
   * Whether this caller may read these bytes (NFR-24/25): they uploaded the
   * object, or it belongs to a discovery shared into a group they are still a
   * member of. Leaving the group therefore revokes access, which key entropy
   * alone never did.
   *
   * The query reaches into `discoveries`, `discovery_groups` and
   * `group_members` from inside the photos module. Importing DiscoveriesModule
   * here is not an option — it imports this one, for the NFR-32 check — and
   * the alternative is a forwardRef() cycle. AuthService.deleteAccount() has
   * the same shape and the same TODO.
   *
   * TODO(discoveries): move this behind a service the discoveries module owns
   * once there is somewhere for it to live that does not close the cycle.
   */
  async canRead(userId: string, objectKey: string): Promise<boolean> {
    const [row] = await this.photos.query<{ allowed: boolean }[]>(
      `
        SELECT
          EXISTS (
            SELECT 1 FROM photos p
            WHERE p.object_key = $1 AND p.user_id = $2
          )
          OR EXISTS (
            SELECT 1
            FROM discoveries d
            JOIN discovery_groups dg ON dg.discovery_id = d.id
            JOIN group_members gm ON gm.group_id = dg.group_id
            WHERE d.image_object_key = $1 AND gm.user_id = $2
          ) AS allowed
      `,
      [objectKey, userId],
    );

    return row?.allowed === true;
  }

  /**
   * Frees an object the caller owns. The ownership check *is* the delete: the
   * row goes only if it is theirs, and the object goes only if the row did.
   * S3-style deletes are idempotent, so a key already gone from MinIO is not
   * an error — only a genuine MinIO failure is.
   *
   * Returns whether anything was freed, so a caller can tell a no-op from a
   * success without a second query.
   */
  async removeOwned(userId: string, objectKey: string): Promise<boolean> {
    const { affected } = await this.photos.delete({ objectKey, userId });

    if (!affected) {
      return false;
    }

    await this.minio.removeObject(this.bucket, objectKey);

    return true;
  }

  /** Every object this account owns — what deleteAccount() has to free. */
  async listOwnedKeys(userId: string): Promise<string[]> {
    const rows = await this.photos.find({
      select: { objectKey: true },
      where: { userId },
    });

    return rows.map((row) => row.objectKey);
  }

  /**
   * Removes objects whose ownership the caller has *already* established.
   *
   * Only deleteAccount() uses this: it harvests the keys with listOwnedKeys()
   * and then deletes the account, which cascades the rows away and leaves
   * removeOwned() nothing to match on. Never call it with a client-supplied
   * key — removeOwned() is the guarded entry point.
   *
   * allSettled rather than all: the account is already irreversibly gone by
   * this point, so one MinIO failure must not abandon the remaining keys and
   * must not turn a completed deletion into a 500.
   */
  async purgeOwnedObjects(objectKeys: string[]): Promise<void> {
    const results = await Promise.allSettled(
      objectKeys.map((key) => this.minio.removeObject(this.bucket, key)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to free object "${objectKeys[index]}" after account deletion.`,
          result.reason,
        );
      }
    });
  }

  /** Backs the storage health indicator. Throws when MinIO is unreachable. */
  async assertBucketReachable(): Promise<void> {
    const exists = await this.minio.bucketExists(this.bucket);

    if (!exists) {
      throw new Error(`Bucket "${this.bucket}" does not exist.`);
    }
  }

  /**
   * FR-06. Never throws: a photo with no GPS tag, or with a corrupt one, must
   * still upload successfully (FR-33 / NFR-33).
   */
  private async readLocation(buffer: Buffer): Promise<PhotoLocation | null> {
    try {
      const gps = await exifr.gps(buffer);

      if (
        typeof gps?.latitude !== 'number' ||
        typeof gps?.longitude !== 'number'
      ) {
        return null;
      }

      const parsed = (await exifr.parse(buffer, ['DateTimeOriginal'])) as
        { DateTimeOriginal?: Date } | undefined;

      return {
        latitude: gps.latitude,
        longitude: gps.longitude,
        takenAt: parsed?.DateTimeOriginal?.toISOString() ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Re-encoding drops every EXIF/XMP/ICC block (NFR-27) and bakes the
   * orientation flag into the pixels. It also validates the file for real: the
   * declared MIME type is client-supplied, sharp reads the actual header.
   */
  private async normalize(
    buffer: Buffer,
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    let format: string | undefined;

    try {
      ({ format } = await sharp(buffer).metadata());
    } catch {
      throw new BadRequestException(
        'The uploaded file is not a readable image.',
      );
    }

    const pipeline = sharp(buffer).rotate();

    switch (format) {
      case 'jpeg':
        return {
          buffer: await pipeline.jpeg({ quality: 90 }).toBuffer(),
          contentType: 'image/jpeg',
          extension: 'jpg',
        };
      case 'png':
        return {
          buffer: await pipeline.png().toBuffer(),
          contentType: 'image/png',
          extension: 'png',
        };
      case 'webp':
        return {
          buffer: await pipeline.webp({ quality: 90 }).toBuffer(),
          contentType: 'image/webp',
          extension: 'webp',
        };
      default:
        throw new BadRequestException(
          `Unsupported image format "${format ?? 'unknown'}". Use JPEG, PNG or WebP.`,
        );
    }
  }
}
