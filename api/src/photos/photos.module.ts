import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discovery } from '../discoveries/discovery.entity';
import { minioClientProvider } from './minio.client';
import { PhotoOrphanCleanupService } from './photo-orphan-cleanup.service';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Discovery])],
  controllers: [PhotosController],
  providers: [minioClientProvider, PhotosService, PhotoOrphanCleanupService],
  // Exported for the storage health indicator, and later for the discoveries
  // module's NFR-32 existence check.
  exports: [PhotosService],
})
export class PhotosModule {}
