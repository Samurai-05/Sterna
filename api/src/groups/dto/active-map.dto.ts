import { ApiProperty } from '@nestjs/swagger';

/**
 * The map new discoveries are being added to (FR-27).
 *
 * Both fields are `null` for the personal map, which is not a group and
 * therefore has no id — the client renders its own label for that case, the
 * way GroupsPage.tsx already does.
 */
export class ActiveMapDto {
  @ApiProperty({ type: String, nullable: true, example: '1' })
  groupId: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Paris Weekend' })
  name: string | null;
}
