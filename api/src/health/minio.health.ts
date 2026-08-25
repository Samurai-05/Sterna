import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PhotosService } from '../photos/photos.service';

/**
 * Reachability of the photo bucket, reported alongside the Postgres ping.
 *
 * An API that cannot store photos cannot create discoveries, so this belongs in
 * the health check the Compose healthcheck and the deploy job gate on.
 */
@Injectable()
export class MinioHealthIndicator {
  constructor(
    private readonly indicators: HealthIndicatorService,
    private readonly photos: PhotosService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);

    try {
      await this.photos.assertBucketReachable();
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : 'MinIO is unreachable',
      });
    }
  }
}
