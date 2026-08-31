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
