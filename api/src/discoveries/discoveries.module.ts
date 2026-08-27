import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from '../groups/groups.module';
import { DiscoveriesController } from './discoveries.controller';
import { Discovery } from './discovery.entity';
import { DiscoveriesService } from './discoveries.service';
import { GroupDiscoveriesController } from './group-discoveries.controller';

/**
 * Imports GroupsModule for its membership check, and GroupsModule imports
 * nothing from here — the dependency runs one way on purpose. That is also
 * why the group map lives in this module under a `groups/...` path rather
 * than in the groups module: the alternative is a cycle and a forwardRef().
 */
@Module({
  imports: [TypeOrmModule.forFeature([Discovery]), GroupsModule],
  controllers: [DiscoveriesController, GroupDiscoveriesController],
  providers: [DiscoveriesService],
})
export class DiscoveriesModule {}
