import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MAX_PASSWORD_LENGTH } from '../password';

export class DeleteAccountDto {
  /**
   * Re-authentication. The delete cascades to every discovery and every group
   * membership the account owns, so a bearer token alone must not trigger it.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  @ApiProperty({ format: 'password' })
  currentPassword: string;
}
