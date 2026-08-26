import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PhotosModule } from '../photos/photos.module';
import { HealthController } from './health.controller';
import { MinioHealthIndicator } from './minio.health';

@Module({
  imports: [TerminusModule, PhotosModule],
  controllers: [HealthController],
  providers: [MinioHealthIndicator],
})
export class HealthModule {}
