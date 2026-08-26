import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimmed } from './normalize';

export class UpdateProfileDto {
  /**
   * The only mutable profile field.
   *
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
}
