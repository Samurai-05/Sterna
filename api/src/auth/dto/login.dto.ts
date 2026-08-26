import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MAX_PASSWORD_LENGTH } from '../password';
import { trimmed } from './normalize';

export class LoginDto {
  @Transform(trimmed)
  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ example: 'ada@sterna.app', maxLength: 255 })
  email: string;

  /**
   * Deliberately validated only as a bounded, non-empty string.
   *
   * Applying the registration length rule here would answer 400 to an account
   * whose password predates a policy change, and would advertise the current
   * policy to anyone probing the endpoint. Every rejection on this route is
   * one 401 with one message. The MaxLength is a cost bound on argon2, not a
   * policy statement.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_PASSWORD_LENGTH)
  @ApiProperty({ example: 'correct horse battery staple', format: 'password' })
  password: string;
}
