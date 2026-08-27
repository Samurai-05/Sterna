import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActiveMapDto } from './dto/active-map.dto';
import { SetActiveMapDto } from './dto/set-active-map.dto';
import { GROUP_NOT_FOUND, GroupsService } from './groups.service';

/**
 * The map the caller is currently adding discoveries to (FR-27, FR-28).
 *
 * Its own controller rather than `/api/groups/active`, for two reasons: the
 * personal map is a valid value and is not a group, and a sibling route under
 * `/groups` would be shadowed by `GET /groups/:id` depending on the order the
 * two happened to be declared in.
 *
 * There is exactly one active map per user at any moment, enforced by
 * uq_group_members_one_active_group_per_user rather than by convention.
 */
@ApiTags('groups')
@Controller('active-map')
export class ActiveMapController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Read the active map',
    description:
      'Both fields are null when the personal map is active, which is the ' +
      'default for a new account and the state a user returns to after ' +
      'leaving the group they had selected.',
  })
  @ApiOkResponse({ type: ActiveMapDto })
  find(@CurrentUser() caller: AuthenticatedUser): Promise<ActiveMapDto> {
    return this.groups.findActiveMap(caller.id);
  }

  @Put()
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Change the active map',
    description:
      'Send a groupId the caller belongs to, or null for the personal map ' +
      '(FR-28). Selecting a group the caller is not a member of is answered ' +
      '404, like every other group route (NFR-19).',
  })
  @ApiOkResponse({ type: ActiveMapDto })
  @ApiNotFoundResponse({ description: GROUP_NOT_FOUND })
  set(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: SetActiveMapDto,
  ): Promise<ActiveMapDto> {
    return this.groups.setActiveMap(caller.id, dto.groupId);
  }
}
