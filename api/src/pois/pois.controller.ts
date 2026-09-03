import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { NearbyPoisDto } from './dto/nearby-pois.dto';
import {
  POI_NEARBY_DEFAULT_RADIUS_METERS,
  PoiResponse,
  PoisService,
} from './pois.service';

const poisExample = [
  {
    id: '1',
    title: 'Eiffel Tower',
    description: 'Landmark in Paris, France.',
    longitude: 2.2945,
    latitude: 48.8584,
    countryCode: 'FRA',
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

  @Get('nearby')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'List points of interest near a coordinate',
    description:
      'Candidates for the confirm-to-unlock flow: a photo of a landmark is ' +
      'often taken well outside the automatic discovery radius (a mountain ' +
      'shot from its valley town, a tower shot from across a square). ' +
      'Sorted by distance, nearest first.',
  })
  @ApiOkResponse({
    description: 'Points of interest within range, nearest first.',
    schema: { example: poisExample },
  })
  findNearby(
    @CurrentUser() caller: AuthenticatedUser,
    @Query() query: NearbyPoisDto,
  ): Promise<PoiResponse[]> {
    return this.pois.findNearby(
      caller.id,
      query.longitude,
      query.latitude,
      query.radius ?? POI_NEARBY_DEFAULT_RADIUS_METERS,
    );
  }

  @Get(':id/image')
  @Public()
  @ApiOperation({
    summary: "Proxy a POI's photo",
    description:
      'Fetches the photo from Wikimedia Commons here, server-side, and streams ' +
      "it back same-origin, rather than the client loading Wikimedia's URL " +
      'directly — the app is often reached over a locked-down campus/lab ' +
      'network that this server, unlike an arbitrary client, is not behind.',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    description: 'Requested width in pixels (default 800, clamped 64–2000).',
  })
  @ApiOkResponse({ description: 'The image bytes.' })
  @ApiNotFoundResponse({ description: 'Unknown POI, or it has no image.' })
  async image(
    @Param('id') id: string,
    @Query('width') width: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { stream, contentType } = await this.pois.getImage(
      id,
      width === undefined ? undefined : Number(width),
    );

    // The catalog is static, but not immutable — an image can still be
    // swapped for a better one — so this is a day, not @Header()'s
    // set-before-the-handler-runs year(s) the photos route uses for
    // truly-immutable keyed uploads.
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    return new StreamableFile(stream, { type: contentType });
  }
}
