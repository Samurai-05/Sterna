import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimmed } from '../../auth/dto/normalize';

export class CreateGroupDto {
  /**
   * 100 is the width of groups.name — without the bound a longer value would
   * reach Postgres and come back as a 500 instead of a 400. MinLength runs
   * after the trim, so "   " is a 400 rather than a groups_name_not_blank
   * violation.
   *
   * Names are not unique: two unrelated groups may both be called "Weekend".
   */
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @ApiProperty({ example: 'Paris Weekend', minLength: 1, maxLength: 100 })
  name: string;

  /**
   * The column is TEXT, so 500 is a product decision rather than a schema one:
   * this is a caption under a group name, not a document.
   */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(500)
  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Everything we found over the long weekend.',
    maxLength: 500,
  })
  description?: string | null;
}
