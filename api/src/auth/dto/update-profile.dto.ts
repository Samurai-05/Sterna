import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimmed } from './normalize';

export class UpdateProfileDto {
  /**
   * Email is not editable: it is the login credential, so changing it is an
   * account-takeover step if a token is stolen, and doing it safely means
   * re-authentication plus a second uniqueness path. Out of MVP scope.
   */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @ApiProperty({
    required: false,
    example: 'Ada L.',
    minLength: 2,
    maxLength: 100,
  })
  userName?: string;

  /**
   * The object key a prior POST /api/photos returned. An explicit `null`
   * removes the current photo; omitting the field leaves it — the same
   * contract UpdateGroupDto.description uses.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ required: false, nullable: true, maxLength: 255 })
  avatarObjectKey?: string | null;
}
