import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { DiscoveryCategory } from './discovery-category';

export class CreateDiscoveryDto {
  @IsOptional()
  @Matches(/^\d+$/)
  groupId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^\d+$/, { each: true })
  groupIds?: string[];

  @IsOptional()
  @IsBoolean()
  personal?: boolean;

  @IsString()
  @Length(1, 150)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(DiscoveryCategory)
  category?: DiscoveryCategory | null;

  @IsLongitude()
  longitude: number;

  @IsLatitude()
  latitude: number;

  @IsString()
  @Length(1)
  imageObjectKey: string;

  @IsDateString()
  discoveredAt: string;
}
