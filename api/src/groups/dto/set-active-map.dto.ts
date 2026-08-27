import { Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetActiveMapDto {
  /**
   * The group to make active, or `null` for the personal map (FR-27, FR-28).
   *
   * `null` is a real value here rather than "unset" — it is how a user goes
   * back to their personal map — so the field is required, and @ValidateIf
   * sends only the non-null case through the pattern check. A decimal string
   * rather than a number, per the BIGINT convention.
   */
  @ValidateIf((_object, value) => value !== null)
  @Matches(/^\d+$/)
  @ApiProperty({ type: String, nullable: true, example: '1' })
  groupId: string | null;
}
