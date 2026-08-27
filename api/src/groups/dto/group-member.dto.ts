import { ApiProperty } from '@nestjs/swagger';
import { GroupRole } from '../group-role';

/** One member of a group, as its other members may see them (FR-32). */
export class GroupMemberDto {
  /** users.id, a decimal string. Treat it as opaque. */
  @ApiProperty({ example: '1' })
  userId: string;

  /**
   * Display name. Deliberately the only thing about the person that crosses
   * the boundary: joining a group must not hand every other member an email
   * address, and nothing in the product needs one.
   */
  @ApiProperty({ example: 'Ada' })
  userName: string;

  @ApiProperty({ enum: GroupRole, example: GroupRole.Member })
  role: GroupRole;

  @ApiProperty({ example: '2026-08-26T09:14:33.482Z', format: 'date-time' })
  joinedAt: string;
}
