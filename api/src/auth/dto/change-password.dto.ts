import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../password';

export class ChangePasswordDto {
  /**
   * Re-authentication: a stolen token alone must not be enough to lock the
   * owner out of their own account.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  @ApiProperty({ format: 'password' })
  currentPassword: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  @ApiProperty({
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
    format: 'password',
  })
  newPassword: string;
}
