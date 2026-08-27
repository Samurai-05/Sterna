import { ApiProperty } from '@nestjs/swagger';
import { GroupMemberDto } from './group-member.dto';
import { GroupSummaryDto } from './group-summary.dto';

/**
 * A single group, as one of its members may see it.
 *
 * Non-members never receive this — they get a 404, so the API does not even
 * confirm that a group with that id exists (NFR-19).
 */
export class GroupDetailDto extends GroupSummaryDto {
  /**
   * The invitation code (FR-26). Members-only by construction: it is the
   * credential that lets someone join, so it may only ever leave through a
   * route that has already established membership.
   */
  @ApiProperty({ example: 'AB3K9QZ2' })
  inviteCode: string;

  @ApiProperty({ type: [GroupMemberDto] })
  members: GroupMemberDto[];

  @ApiProperty({ example: '2026-08-26T09:14:33.482Z', format: 'date-time' })
  createdAt: string;
}
