import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class SearchLocationsDto {
  @ApiProperty({ example: 'Lausanne', minLength: 2, maxLength: 200 })
  @Transform(({ value }) => trimQuery(value))
  @IsString()
  @Length(2, 200)
  q: string;
}

function trimQuery(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
