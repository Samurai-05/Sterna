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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDiscoveryDto } from './create-discovery.dto';
import { DiscoveryParamsDto } from './discovery-params.dto';
import { DiscoveriesService, DiscoveryResponse } from './discoveries.service';
import { UpdateDiscoveryDto } from './update-discovery.dto';

const discoveryExample = {
  id: '1',
  userId: '1',
  groupId: null,
  title: 'Vue sur le lac',
  description: 'Balade du dimanche',
  category: 'Landscape',
  longitude: 6.6412,
  latitude: 46.7785,
  imageObjectKey: 'discoveries/lake.jpg',
  discoveredAt: '2026-08-25T12:00:00.000Z',
  createdAt: '2026-08-25T12:01:00.000Z',
  updatedAt: '2026-08-25T12:01:00.000Z',
};

@ApiTags('discoveries')
@Controller('discoveries')
export class DiscoveriesController {
  constructor(private readonly discoveries: DiscoveriesService) {}

  @Get()
  @ApiAuthenticated()
  @ApiOperation({
    summary: "List the signed-in user's discoveries",
    description:
      'Reads only discoveries authored by the signed-in user and extracts ' +
      'coordinates with PostGIS.',
  })
  @ApiOkResponse({
    description: 'Discoveries authored by the signed-in user.',
    schema: { example: [discoveryExample] },
  })
  findAll(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<DiscoveryResponse[]> {
    return this.discoveries.findAllByUser(caller.id);
  }

  @Get(':id')
  @ApiAuthenticated()
  @ApiOperation({ summary: 'Get one discovery owned by the signed-in user' })
  @ApiOkResponse({ schema: { example: discoveryExample } })
  @ApiNotFoundResponse({ description: 'Discovery not found.' })
  findOne(
    @CurrentUser() caller: AuthenticatedUser,
    @Param() params: DiscoveryParamsDto,
  ): Promise<DiscoveryResponse> {
    return this.discoveries.findOneByUser(params.id, caller.id);
  }

  @Post()
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Create a discovery',
    description:
      'Stores a user discovery and writes its coordinates as a PostGIS Point.',
  })
  @ApiCreatedResponse({
    description: 'Discovery created.',
    schema: { example: discoveryExample },
  })
  create(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateDiscoveryDto,
  ): Promise<DiscoveryResponse> {
    return this.discoveries.create(caller.id, dto);
  }

  @Patch(':id')
  @ApiAuthenticated()
  @ApiOperation({ summary: 'Update a discovery owned by the signed-in user' })
  @ApiOkResponse({ schema: { example: discoveryExample } })
  @ApiNotFoundResponse({ description: 'Discovery not found.' })
  update(
    @CurrentUser() caller: AuthenticatedUser,
    @Param() params: DiscoveryParamsDto,
    @Body() dto: UpdateDiscoveryDto,
  ): Promise<DiscoveryResponse> {
    return this.discoveries.update(params.id, caller.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuthenticated()
  @ApiOperation({ summary: 'Delete a discovery owned by the signed-in user' })
  @ApiNoContentResponse({ description: 'Discovery deleted.' })
  @ApiNotFoundResponse({ description: 'Discovery not found.' })
  remove(
    @CurrentUser() caller: AuthenticatedUser,
    @Param() params: DiscoveryParamsDto,
  ): Promise<void> {
    return this.discoveries.remove(params.id, caller.id);
  }
}
