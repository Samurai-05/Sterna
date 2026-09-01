import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PHOTO_OBJECT_KEY_PATTERN } from '../../photos/photos.service';
import { trimmed } from './normalize';

export class UpdateProfileDto {
  /**
   * Email is not editable: it is the login credential, so changing it is an
   * account-takeover step if a token is stolen, and doing it safely means
   * re-authentication plus a second uniqueness path. Out of MVP scope.
   */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @ApiProperty({
    required: false,
    example: 'Ada L.',
    minLength: 2,
    maxLength: 100,
  })
  userName?: string;

  /**
   * The object key a prior POST /api/photos returned. An explicit `null`
   * removes the current photo; omitting the field leaves it — the same
   * contract UpdateGroupDto.description uses.
   *
   * The shape is pinned and AuthService.updateProfile() checks that this
   * caller uploaded it. Both are load-bearing: the previous value is fed to
   * PhotosService.removeOwned() on the next update, so an unchecked key here
   * is a way to point the delete path at somebody else's object.
   */
  @IsOptional()
  @IsString()
  @Matches(PHOTO_OBJECT_KEY_PATTERN)
  @ApiProperty({
    required: false,
    nullable: true,
    example: 'photos/6f1c9e0e-8b1a-4d3f-9c2e-0a1b2c3d4e5f.jpg',
  })
  avatarObjectKey?: string | null;
}
