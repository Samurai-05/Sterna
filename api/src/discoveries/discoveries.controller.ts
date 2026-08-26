import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateDiscoveryDto } from './create-discovery.dto';
import { DiscoveriesService, DiscoveryResponse } from './discoveries.service';

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

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List discoveries',
    description:
      'Reads discoveries from PostgreSQL and extracts coordinates with PostGIS.',
  })
  @ApiOkResponse({
    description: 'Known discoveries.',
    schema: { example: [discoveryExample] },
  })
  findAll(): Promise<DiscoveryResponse[]> {
    return this.discoveries.findAll();
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
}
