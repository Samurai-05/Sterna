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
import { ApiProperty } from '@nestjs/swagger';
import { PHOTO_OBJECT_KEY_PATTERN } from '../photos/photos.service';
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

  /**
   * The key a prior POST /api/photos returned, and only such a key: the shape
   * is pinned here so a hand-crafted value cannot reach the object store, and
   * DiscoveriesService.create() then checks that this caller is the account
   * that uploaded it. A well-formed key is not an authorization — it is
   * published to every member of a shared group map.
   */
  @IsString()
  @Matches(PHOTO_OBJECT_KEY_PATTERN)
  @ApiProperty({ example: 'photos/6f1c9e0e-8b1a-4d3f-9c2e-0a1b2c3d4e5f.jpg' })
  imageObjectKey: string;

  @IsDateString()
  discoveredAt: string;
}
