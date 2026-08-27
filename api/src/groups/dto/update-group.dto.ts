import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimmed } from '../../auth/dto/normalize';

/**
 * Both fields are optional, but a body carrying neither is refused rather than
 * silently doing nothing — the same contract as UpdateProfileDto.
 *
 * The invitation code is deliberately absent: it is issued by the API, not
 * chosen by the owner.
 */
export class UpdateGroupDto {
  // @ValidateIf rather than @IsOptional, which would wave an explicit `null`
  // through and turn groups.name's NOT NULL into a 500. Omitting the field is
  // fine; clearing a required column is a 400.
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @ApiProperty({
    required: false,
    example: 'Paris Weekend 2026',
    minLength: 1,
    maxLength: 100,
  })
  name?: string;

  /** An explicit `null` clears the description; omitting the field leaves it. */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(500)
  @ApiProperty({ required: false, nullable: true, maxLength: 500 })
  description?: string | null;
}
