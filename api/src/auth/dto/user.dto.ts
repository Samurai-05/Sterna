import { ApiProperty } from '@nestjs/swagger';

/** An account, as any authenticated caller may see their own. */
export class UserDto {
  /**
   * users.id. A decimal string rather than a number: the column is BIGINT,
   * which is lossy above 2^53-1 as a JS number and cannot be JSON-serialised
   * as a native bigint. Treat it as opaque.
   */
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'ada@sterna.app' })
  email: string;

  /** Display name, shown as the author of a group discovery (FR-31). */
  @ApiProperty({ example: 'Ada' })
  userName: string;

  /** ISO 8601 instant at which the account was created. */
  @ApiProperty({ example: '2026-08-26T09:14:33.482Z', format: 'date-time' })
  createdAt: string;
}
