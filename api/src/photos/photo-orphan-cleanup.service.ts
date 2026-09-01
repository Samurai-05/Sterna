import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { DataSource } from 'typeorm';
import { MINIO_CLIENT } from './minio.client';
import { PHOTO_OBJECT_KEY_PATTERN, PhotosService } from './photos.service';

export const PHOTO_ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
const PHOTO_ORPHAN_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

type ListedPhoto = {
  name?: string;
  lastModified?: Date;
};

/** Periodically removes old canonical uploads that never became discoveries. */
@Injectable()
export class PhotoOrphanCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PhotoOrphanCleanupService.name);
  private readonly bucket: string;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minio: Client,
    config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly photos: PhotosService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET_NAME');
  }

  onModuleInit(): void {
    this.timer = setInterval(
      () => void this.sweep(),
      PHOTO_ORPHAN_SWEEP_INTERVAL_MS,
    );
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(now = new Date()): Promise<void> {
    const cutoff = now.getTime() - PHOTO_ORPHAN_TTL_MS;
    const candidates: string[] = [];

    try {
      for await (const item of this.minio.listObjects(
        this.bucket,
        'photos/',
        false,
      ) as AsyncIterable<ListedPhoto>) {
        if (
          typeof item.name === 'string' &&
          PHOTO_OBJECT_KEY_PATTERN.test(item.name) &&
          item.lastModified instanceof Date &&
          item.lastModified.getTime() < cutoff
        ) {
          candidates.push(item.name);
        }
      }
    } catch (error) {
      this.logger.error(
        'Unable to list candidate orphaned photos.',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    if (candidates.length === 0) return;

    let referenced = new Set<string>();
    try {
      const rows = await this.dataSource.query<Array<{ object_key: string }>>(
        `SELECT image_object_key AS object_key
         FROM discoveries
         WHERE image_object_key = ANY($1::text[])
         UNION
         SELECT avatar_object_key AS object_key
         FROM users
         WHERE avatar_object_key = ANY($1::text[])`,
        [candidates],
      );
      referenced = new Set(rows.map((row) => row.object_key));
    } catch (error) {
      this.logger.error(
        'Unable to check orphaned photo references; no candidates were removed.',
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    for (const objectKey of candidates) {
      if (referenced.has(objectKey)) continue;

      try {
        await this.photos.remove(objectKey);
      } catch (error) {
        this.logger.error(
          `Unable to remove orphaned photo family ${objectKey}.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
