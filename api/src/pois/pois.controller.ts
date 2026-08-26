import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PoiResponse, PoisService } from './pois.service';

const poisExample = [
  {
    id: '1',
    title: 'Eiffel Tower',
    description: 'Landmark in Paris, France.',
    longitude: 2.2945,
    latitude: 48.8584,
    imageUrl: null,
  },
];

@ApiTags('pois')
@Controller('pois')
export class PoisController {
  constructor(private readonly pois: PoisService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List points of interest',
    description:
      'Reads points of interest from PostgreSQL and extracts coordinates with PostGIS.',
  })
  @ApiOkResponse({
    description: 'Known points of interest.',
    schema: { example: poisExample },
  })
  findAll(): Promise<PoiResponse[]> {
    return this.pois.findAll();
  }
}
