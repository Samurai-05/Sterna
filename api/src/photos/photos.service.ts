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
    const exif = await this.readLocation(file.buffer);
    const { buffer, contentType, extension } = await this.normalize(
      file.buffer,
    );

    const filename = `${randomUUID()}.${extension}`;
    const objectKey = `${KEY_PREFIX}/${filename}`;

    await this.minio.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
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
