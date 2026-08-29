import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { SearchLocationsDto } from './dto/search-locations.dto';
import { GeocodingService, LocationSearchResult } from './geocoding.service';

@ApiTags('geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Get('search')
  @ApiAuthenticated()
  @ApiOperation({ summary: 'Search countries, settlements and places' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'relation:1688687',
          label: 'Lausanne, District de Lausanne, Vaud, Suisse',
          type: 'city',
          longitude: 6.6327,
          latitude: 46.5218,
          zoom: 12,
        },
      ],
    },
  })
  search(@Query() query: SearchLocationsDto): Promise<LocationSearchResult[]> {
    return this.geocoding.search(query.q);
  }
}
