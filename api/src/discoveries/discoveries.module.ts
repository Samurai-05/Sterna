import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from '../groups/groups.module';
import { PhotosModule } from '../photos/photos.module';
import { DiscoveriesController } from './discoveries.controller';
import { Discovery } from './discovery.entity';
import { DiscoveriesService } from './discoveries.service';
import { GroupDiscoveriesController } from './group-discoveries.controller';

/**
 * Imports GroupsModule for its membership check, and GroupsModule imports
 * nothing from here — the dependency runs one way on purpose. That is also
 * why the group map lives in this module under a `groups/...` path rather
 * than in the groups module: the alternative is a cycle and a forwardRef().
 *
 * PhotosModule runs the same way round: create() asks it whether the caller
 * owns the key and whether the object exists (NFR-32), and it asks nothing
 * back.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Discovery]), GroupsModule, PhotosModule],
  controllers: [DiscoveriesController, GroupDiscoveriesController],
  providers: [DiscoveriesService],
})
export class DiscoveriesModule {}
