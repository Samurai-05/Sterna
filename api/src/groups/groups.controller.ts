import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupDetailDto } from './dto/group-detail.dto';
import { GroupSummaryDto } from './dto/group-summary.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GROUP_NOT_FOUND, GroupsService } from './groups.service';

/**
 * Groups and their shared maps (FR-25, FR-26, FR-29, FR-31, FR-32, FR-33).
 *
 * Every route is protected by the global guard, and every one of them is
 * scoped to the caller's memberships. **A non-member is answered 404, not
 * 403** — a group must be invisible to people outside it (NFR-19), and 403
 * would still confirm that the group exists.
 *
 * The active map lives on its own controller (`/api/active-map`): the personal
 * map is a legitimate value for it and is not a group at all.
 */
@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Create a group',
    description:
      "The caller becomes the group's owner. The response carries the " +
      'invitation code to share (FR-25, FR-26). Creating a group does not ' +
      'make it the active map — call PUT /api/active-map for that, so a new ' +
      'group never silently redirects the next discovery.',
  })
  @ApiCreatedResponse({ type: GroupDetailDto })
  @ApiBadRequestResponse({ description: 'The name is missing or too long.' })
  create(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupDetailDto> {
    return this.groups.create(caller.id, dto);
  }

  @Get()
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'List the groups the caller belongs to',
    description:
      "Each row carries the caller's own role, whether the group is their " +
      'active map, and the member and discovery counts the Groups screen ' +
      'renders. Groups the caller does not belong to are not listed and ' +
      'cannot be reached any other way (NFR-19).',
  })
  @ApiOkResponse({ type: [GroupSummaryDto] })
  findAll(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<GroupSummaryDto[]> {
    return this.groups.findAllForUser(caller.id);
  }

  @Post('join')
  // Nest answers 201 to a POST by default; joining creates no resource the
  // caller can address, and re-joining creates nothing at all.
  @HttpCode(HttpStatus.OK)
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Join a group with an invitation code',
    description:
      'The code is compared case-insensitively and ignores spaces and ' +
      'dashes, so "ab3k-9qz2" and "AB3K9QZ2" are the same invitation ' +
      '(FR-26). Joining twice is a no-op rather than an error — an ' +
      'invitation link is something people open more than once — and it ' +
      'cannot demote an owner who follows their own link back.',
  })
  @ApiOkResponse({ type: GroupDetailDto })
  @ApiNotFoundResponse({
    description: 'No group matches this invitation code.',
  })
  join(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: JoinGroupDto,
  ): Promise<GroupDetailDto> {
    return this.groups.join(caller.id, dto.inviteCode);
  }

  @Get(':id')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Read one group',
    description:
      'Members only, including the member list (FR-32) and the invitation ' +
      'code. A caller who is not a member is answered 404 rather than 403, ' +
      'so the API does not confirm that the group exists (NFR-19).',
  })
  @ApiOkResponse({ type: GroupDetailDto })
  @ApiNotFoundResponse({ description: GROUP_NOT_FOUND })
  findOne(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<GroupDetailDto> {
    return this.groups.findOneForMember(caller.id, id);
  }

  @Patch(':id')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Rename or re-describe a group',
    description:
      'Owner only. A plain member is answered 403 rather than 404 here: they ' +
      'can already see the group, so there is nothing left to hide and ' +
      '"you are not the owner" is the useful answer. The invitation code is ' +
      'issued by the API and cannot be set.',
  })
  @ApiOkResponse({ type: GroupDetailDto })
  @ApiBadRequestResponse({
    description: 'Nothing to update, or a field failed validation.',
  })
  @ApiForbiddenResponse({ description: 'Only the group owner may do this.' })
  @ApiNotFoundResponse({ description: GROUP_NOT_FOUND })
  update(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ): Promise<GroupDetailDto> {
    return this.groups.update(caller.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Delete a group',
    description:
      'Owner only. The discoveries recorded in the group are not destroyed ' +
      'with it: each goes back to the personal map of whoever took it.',
  })
  @ApiNoContentResponse({ description: 'The group was deleted.' })
  @ApiForbiddenResponse({ description: 'Only the group owner may do this.' })
  @ApiNotFoundResponse({ description: GROUP_NOT_FOUND })
  remove(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.groups.remove(caller.id, id);
  }

  @Delete(':id/members/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Leave a group',
    description:
      "The caller's own discoveries in the group move to their personal map " +
      'rather than being deleted (FR-33). If the group was the active map, ' +
      'the personal map becomes active. The owner cannot leave — they delete ' +
      'the group instead, because nothing else would stop a group from being ' +
      'left with no owner.',
  })
  @ApiNoContentResponse({ description: 'The caller left the group.' })
  @ApiConflictResponse({ description: 'The owner cannot leave the group.' })
  @ApiNotFoundResponse({ description: GROUP_NOT_FOUND })
  leave(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.groups.leave(caller.id, id);
  }
}
