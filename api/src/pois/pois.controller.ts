import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PoiResponse, PoisService } from './pois.service';

const poisExample = [
  {
    id: '1',
    title: 'Eiffel Tower',
    description: 'Landmark in Paris, France.',
    longitude: 2.2945,
    latitude: 48.8584,
    imageUrl: null,
    discovered: false,
  },
];

@ApiTags('pois')
@Controller('pois')
export class PoisController {
  constructor(private readonly pois: PoisService) {}

  @Get()
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'List points of interest',
    description:
      'Reads points of interest from PostgreSQL and extracts coordinates with PostGIS.',
  })
  @ApiOkResponse({
    description: 'Known points of interest.',
    schema: { example: poisExample },
  })
  findAll(@CurrentUser() caller: AuthenticatedUser): Promise<PoiResponse[]> {
    return this.pois.findAll(caller.id);
  }

  @Get('authored')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'List points of interest discovered by the signed-in user',
    description:
      'Calculates discovery status from every discovery authored by the user, ' +
      'independently of the active map and destination maps.',
  })
  @ApiOkResponse({
    description: 'Known points of interest with user-wide discovery status.',
    schema: { example: poisExample },
  })
  findAllAuthored(
    @CurrentUser() caller: AuthenticatedUser,
  ): Promise<PoiResponse[]> {
    return this.pois.findAllAuthoredByUser(caller.id);
  }
}
