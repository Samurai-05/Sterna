import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { minioClientProvider } from './minio.client';
import { Photo } from './photo.entity';
import { PhotoOrphanCleanupService } from './photo-orphan-cleanup.service';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Photo])],
  controllers: [PhotosController],
  providers: [minioClientProvider, PhotosService, PhotoOrphanCleanupService],
  // Exported for the storage health indicator, for the auth module's avatar
  // handling, and for the discoveries module's NFR-32 and ownership checks.
  exports: [PhotosService],
})
export class PhotosModule {}
