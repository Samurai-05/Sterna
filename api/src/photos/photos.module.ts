import { Module } from '@nestjs/common';
import { minioClientProvider } from './minio.client';
import { PhotoOrphanCleanupService } from './photo-orphan-cleanup.service';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  controllers: [PhotosController],
  providers: [minioClientProvider, PhotosService, PhotoOrphanCleanupService],
  // Exported for the storage health indicator, and later for the discoveries
  // module's NFR-32 existence check.
  exports: [PhotosService],
})
export class PhotosModule {}
