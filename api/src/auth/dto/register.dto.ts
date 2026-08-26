import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password';
import { trimmed } from './normalize';

export class RegisterDto {
  /**
   * Login identifier, unique across accounts and compared case-insensitively:
   * the API lower-cases it before storing and before looking it up.
   *
   * 255 is the width of users.email — without the bound a longer value would
   * reach Postgres and come back as a 500 instead of a 400.
   */
  @Transform(trimmed)
  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ example: 'ada@sterna.app', maxLength: 255 })
  email: string;

  /** Display name. Shown as the author of a group discovery (FR-31). */
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @ApiProperty({ example: 'Ada', minLength: 2, maxLength: 100 })
  userName: string;

  /**
   * At least 12 characters (OWASP ASVS 4.0 §2.1.1). There is deliberately no
   * upper/lower/digit/symbol rule — §2.1.9 argues against them.
   */
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  @ApiProperty({
    example: 'correct horse battery staple',
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
    format: 'password',
  })
  password: string;
}
