import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

/** What register and login hand back: a token plus the account it belongs to. */
export class AuthResponseDto {
  /** Send as `Authorization: Bearer <accessToken>` on every protected route. */
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  /** Always `Bearer`. Present so a client can build the header generically. */
  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  /**
   * Lifetime of `accessToken` in seconds (RFC 6749 §4.2.2).
   *
   * There is no refresh token: when it expires the user logs in again
   * (ADR-009).
   */
  @ApiProperty({ example: 604800 })
  expiresIn: number;

  user: UserDto;
}
