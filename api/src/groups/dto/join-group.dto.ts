import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinGroupDto {
  /**
   * Validated only as a bounded, non-empty string.
   *
   * The real check is whether it resolves to a group, and the service
   * normalises case, spaces and dashes before looking it up. Enforcing the
   * exact shape here would answer 400 where the endpoint should answer 404,
   * and would advertise the code format to anyone probing it.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @ApiProperty({ example: 'AB3K9QZ2', maxLength: 32 })
  inviteCode: string;
}
