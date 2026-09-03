import { Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { POI_NEARBY_MAX_RADIUS_METERS } from '../pois.service';

export class NearbyPoisDto {
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  /** Defaults to POI_NEARBY_DEFAULT_RADIUS_METERS when omitted — see
   * PoisController.nearby. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(POI_NEARBY_MAX_RADIUS_METERS)
  radius?: number;
}
