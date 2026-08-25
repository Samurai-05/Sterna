import { Module } from '@nestjs/common';
import { minioClientProvider } from './minio.client';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  controllers: [PhotosController],
  providers: [minioClientProvider, PhotosService],
  // Exported for the storage health indicator, and later for the discoveries
  // module's NFR-32 existence check.
  exports: [PhotosService],
})
export class PhotosModule {}
