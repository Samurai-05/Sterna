import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GROUP_NOT_FOUND, GroupsService } from '../groups/groups.service';
import { DiscoveriesService, DiscoveryResponse } from './discoveries.service';

/**
 * A group's shared map (FR-29).
 *
 * Lives in the discoveries module rather than the groups module so the
 * dependency between the two runs one way: this reads discoveries and merely
 * asks GroupsService whether the caller is allowed to. Putting it the other
 * way round would make the two modules mutually dependent.
 */
@ApiTags('groups')
@Controller('groups/:groupId/discoveries')
export class GroupDiscoveriesController {
  constructor(
    private readonly discoveries: DiscoveriesService,
    private readonly groups: GroupsService,
  ) {}

  @Get()
  @ApiAuthenticated()
  @ApiOperation({
    summary: "List a group's discoveries",
    description:
      'Every discovery recorded in this group, by any member, each carrying ' +
      'its author (FR-29, FR-31). Members only: a non-member is answered ' +
      '404. Only discoveries saved or explicitly shared to this group appear ' +
      'here, whether or not they also remain personal (NFR-25).',
  })
  @ApiOkResponse({ description: 'The discoveries on the group map.' })
  @ApiNotFoundResponse({ description: GROUP_NOT_FOUND })
  async findAll(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('groupId') groupId: string,
  ): Promise<DiscoveryResponse[]> {
    await this.groups.requireMembership(caller.id, groupId);

    return this.discoveries.findAllByGroup(groupId);
  }
}
