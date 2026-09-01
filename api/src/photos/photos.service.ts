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

/**
 * The only shape store() ever produces, and therefore the only shape a
 * client-supplied key may have — a randomUUID() (always v4) plus one of the
 * three extensions normalize() emits.
 *
 * Exported because the DTOs that accept a key — CreateDiscoveryDto
 * .imageObjectKey and UpdateProfileDto.avatarObjectKey — have to reject a
 * malformed one before it ever reaches an ownership check, and because the
 * orphan sweep uses it to tell canonical uploads from their variants.
 */
export const PHOTO_OBJECT_KEY_PATTERN =
  /^photos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

// read() is handed the bare filename, everything else the full key. Derived
// from the pattern above rather than written twice, so the two cannot drift.
const FILENAME_PATTERN = new RegExp(
  `^${PHOTO_OBJECT_KEY_PATTERN.source.replace(`^${KEY_PREFIX}\\/`, '')}`,
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
const PHOTO_VARIANTS = ['map', 'card', 'detail'] as const;

export type PhotoVariant = (typeof PHOTO_VARIANTS)[number];

export const PHOTO_VARIANT_WIDTHS: Record<PhotoVariant, number> = {
  map: 192,
  card: 640,
  detail: 1600,
};

export interface PhotoLocation {
  latitude: number;
  longitude: number;
}

export interface PhotoMetadata {
  location: PhotoLocation | null;
  takenAt: string | null;
}

export interface StoredPhoto {
  objectKey: string;
  url: string;
  metadata: PhotoMetadata;
  /** Kept for clients released before the metadata response was split. */
  exif: (PhotoLocation & { takenAt: string | null }) | null;
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
   */
  async store(userId: string, file: Express.Multer.File): Promise<StoredPhoto> {
    const metadata = await this.readMetadata(file.buffer);
    const { buffer, contentType, extension } = await this.normalize(
      file.buffer,
    );

    const filename = `${randomUUID()}.${extension}`;
    const objectKey = `${KEY_PREFIX}/${filename}`;

    try {
      await this.minio.putObject(
        this.bucket,
        objectKey,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
        },
      );

      const stem = objectKey.replace(/\.[^.]+$/, '');
      for (const variant of PHOTO_VARIANTS) {
        const variantBuffer = await sharp(buffer)
          .resize({
            width: PHOTO_VARIANT_WIDTHS[variant],
            withoutEnlargement: true,
          })
          .webp({ quality: 90 })
          .toBuffer();
        const variantKey = `${stem}.${variant}.webp`;

        await this.minio.putObject(
          this.bucket,
          variantKey,
          variantBuffer,
          variantBuffer.length,
          { 'Content-Type': 'image/webp' },
        );
      }
    } catch (error) {
      // MinIO has no transaction spanning these independent objects. Remove
      // the complete object family so a retry cannot leave orphaned variants.
      // Keep the upload failure as the error reported to the caller.
      try {
        await this.remove(objectKey);
      } catch {
        // The original storage error is still the most useful failure here.
      }

      throw error;
    }

    // Written once the whole object family is stored, never before: a row
    // pointing at a key whose upload failed would pass the ownership check on
    // POST /api/discoveries and then fail the existence check, which is a
    // needlessly confusing way to report a broken upload.
    await this.photos.insert({
      objectKey,
      userId,
      contentType,
      byteSize: String(buffer.length),
    });

    return {
      objectKey,
      url: `/api/photos/${filename}`,
      metadata,
      exif: metadata.location
        ? { ...metadata.location, takenAt: metadata.takenAt }
        : null,
    };
  }

  /** Streams a stored photo back out. Used by the read endpoint. */
  async read(
    filename: string,
    variant?: string,
  ): Promise<{ stream: Readable; contentType: string; size: number }> {
    if (!FILENAME_PATTERN.test(filename)) {
      throw new NotFoundException(`Unknown photo "${filename}".`);
    }

    if (variant && !PHOTO_VARIANTS.includes(variant as PhotoVariant)) {
      throw new NotFoundException(`Unknown photo variant "${variant}".`);
    }

    const originalKey = `${KEY_PREFIX}/${filename}`;
    const stem = originalKey.replace(/\.[^.]+$/, '');
    const variantKey = variant ? `${stem}.${variant}.webp` : originalKey;

    try {
      return await this.readObject(variantKey);
    } catch (error) {
      if (!isObjectMissing(error)) {
        throw error;
      }

      if (variant) {
        try {
          return await this.readObject(originalKey);
        } catch (fallbackError) {
          if (!isObjectMissing(fallbackError)) {
            throw fallbackError;
          }
        }
      }

      throw new NotFoundException(`Unknown photo "${filename}".`);
    }
  }

  private async readObject(objectKey: string): Promise<{
    stream: Readable;
    contentType: string;
    size: number;
  }> {
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
  }

  /**
   * NFR-32: POST /api/discoveries must refuse to create a discovery whose photo
   * does not exist. Called from the discoveries module once it exists.
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

  isCanonicalObjectKey(objectKey: string): boolean {
    return PHOTO_OBJECT_KEY_PATTERN.test(objectKey);
  }

  /**
   * Frees a photo family outright — the metadata row and every object — with
   * **no ownership check**.
   *
   * It has exactly one caller, PhotoOrphanCleanupService, which is a
   * background sweep: the key comes from listing the bucket, not from a
   * request, and the sweep has already established that nothing references
   * it. store() also uses it to roll back a partially written family.
   *
   * **Do not wire this to a controller.** A key is not a capability — it is
   * returned in full to every member of a shared group map — so a
   * request-reachable unguarded delete is how one user erases another user's
   * photo. removeOwned() is the guarded entry point.
   */
  async remove(objectKey: string): Promise<void> {
    await this.photos.delete({ objectKey });
    await this.removeObjectFamily(objectKey);
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
   * Asked of the canonical key only. A variant is derived from it server-side
   * (read() takes the variant as a separate argument), so there is exactly one
   * identity to authorise per photo family.
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
   * Frees a photo family the caller owns. The ownership check *is* the delete:
   * the row goes only if it is theirs, and the objects go only if the row did.
   *
   * This is the only delete path a request can reach. remove() above is
   * deliberately unguarded and must stay that way — see its docblock.
   *
   * Returns whether anything was freed, so a caller can tell a no-op from a
   * success without a second query.
   */
  async removeOwned(userId: string, objectKey: string): Promise<boolean> {
    const { affected } = await this.photos.delete({ objectKey, userId });

    if (!affected) {
      return false;
    }

    await this.removeObjectFamily(objectKey);

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
   * Removes families whose ownership the caller has *already* established.
   *
   * Only deleteAccount() uses this: it harvests the keys with listOwnedKeys()
   * and then deletes the account, which cascades the rows away through
   * fk_photos_user and leaves removeOwned() nothing to match on. Never call it
   * with a client-supplied key — removeOwned() is the guarded entry point.
   *
   * allSettled rather than all: the account is already irreversibly gone by
   * this point, so one MinIO failure must not abandon the remaining keys and
   * must not turn a completed deletion into a 500.
   */
  async purgeOwnedObjects(objectKeys: string[]): Promise<void> {
    const results = await Promise.allSettled(
      objectKeys.map((key) => this.removeObjectFamily(key)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to free object family "${objectKeys[index]}" after account deletion.`,
          result.reason,
        );
      }
    });
  }

  /**
   * The original plus every derived variant. S3-style deletes are idempotent,
   * so a key already gone from MinIO is not an error — only a genuine MinIO
   * failure is, and the first one is reported.
   */
  private async removeObjectFamily(objectKey: string): Promise<void> {
    const stem = objectKey.replace(/\.[^.]+$/, '');
    const results = await Promise.allSettled(
      [
        objectKey,
        ...PHOTO_VARIANTS.map((variant) => `${stem}.${variant}.webp`),
      ].map((key) => this.minio.removeObject(this.bucket, key)),
    );
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failed) throw failed.reason;
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
  private async readMetadata(buffer: Buffer): Promise<PhotoMetadata> {
    let location: PhotoLocation | null = null;
    let takenAt: string | null = null;

    try {
      const gps = await exifr.gps(buffer);
      if (
        typeof gps?.latitude === 'number' &&
        typeof gps?.longitude === 'number' &&
        Number.isFinite(gps.latitude) &&
        Number.isFinite(gps.longitude)
      ) {
        location = { latitude: gps.latitude, longitude: gps.longitude };
      }
    } catch {
      // Missing or malformed GPS must not prevent the independent date read.
    }

    try {
      const parsed = (await exifr.parse(buffer, ['DateTimeOriginal'])) as
        { DateTimeOriginal?: Date | string } | undefined;
      const candidate = parsed?.DateTimeOriginal;
      if (candidate instanceof Date && !Number.isNaN(candidate.valueOf())) {
        takenAt = candidate.toISOString();
      } else if (typeof candidate === 'string') {
        const date = new Date(candidate);
        if (!Number.isNaN(date.valueOf())) takenAt = date.toISOString();
      }
    } catch {
      // A malformed date must not discard valid GPS metadata.
    }

    return { location, takenAt };
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
