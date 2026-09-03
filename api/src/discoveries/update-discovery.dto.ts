import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { DiscoveryCategory } from './discovery-category';

export class UpdateDiscoveryDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^\d+$/, { each: true })
  groupIds?: string[];

  /**
   * Explicitly links this discovery to a POI regardless of distance — the
   * confirm-to-unlock flow, for a landmark photographed from outside
   * POI_DISCOVERY_RADIUS_METERS. `null` unlinks; omitted leaves the existing
   * link (if any) untouched — see DiscoveriesService.update's
   * hasOwnProperty check, the same pattern `description` already uses.
   */
  @IsOptional()
  @Matches(/^\d+$/)
  confirmedPoiId?: string | null;

  @IsOptional()
  @IsBoolean()
  personal?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(DiscoveryCategory)
  category?: DiscoveryCategory;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsLatitude()
  latitude?: number;
}
