import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import * as exifr from 'exifr';
import { Client } from 'minio';
import sharp from 'sharp';
import { MINIO_CLIENT } from './minio.client';

/** NFR-21: only these three formats, 10 MB maximum. */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const KEY_PREFIX = 'photos';
const FILENAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const PHOTO_OBJECT_KEY_PATTERN =
  /^photos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;
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
  private readonly bucket: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minio: Client,
    config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  /**
   * Reads the location out of the original bytes, then stores a re-encoded copy
   * that carries no metadata at all (NFR-27). Returns the object key that the
   * caller will later save in DISCOVERIES.image_object_key.
   */
  async store(file: Express.Multer.File): Promise<StoredPhoto> {
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
   * Frees the object behind a discovery that no longer exists. S3-style
   * deletes are idempotent, so a key that is already gone is not an error —
   * only a genuine MinIO failure is.
   */
  async remove(objectKey: string): Promise<void> {
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
