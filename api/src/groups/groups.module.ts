import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveMapController } from './active-map.controller';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

/**
 * forFeature() registers the two entities on the shared connection so
 * autoLoadEntities picks them up — the service itself queries through the
 * DataSource, but the entities are what keep `migration:generate` honest about
 * the tables it now knows.
 *
 * GroupsService is exported because DiscoveriesModule needs
 * requireMembership() to refuse a discovery aimed at a group its author does
 * not belong to. The dependency runs one way only: nothing here imports the
 * discoveries module.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember])],
  controllers: [GroupsController, ActiveMapController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
