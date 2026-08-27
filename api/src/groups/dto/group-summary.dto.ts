import { ApiProperty } from '@nestjs/swagger';
import { GroupRole } from '../group-role';

/** One row of GET /api/groups — what the Groups screen lists. */
export class GroupSummaryDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Paris Weekend' })
  name: string;

  @ApiProperty({ type: String, nullable: true, example: 'Our long weekend.' })
  description: string | null;

  /** The *caller's* role in this group, not the group's owner. */
  @ApiProperty({ enum: GroupRole, example: GroupRole.Owner })
  role: GroupRole;

  /**
   * Whether this group is the caller's active map (FR-27). At most one row in
   * the list has it set; none means the personal map is active.
   */
  @ApiProperty({ example: false })
  isActive: boolean;

  /** Counts rather than the collections themselves: the list renders "N members · M discoveries". */
  @ApiProperty({ example: 3 })
  memberCount: number;

  @ApiProperty({ example: 12 })
  discoveryCount: number;
}
