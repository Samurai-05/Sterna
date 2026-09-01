import { ApiProperty } from '@nestjs/swagger';

/** Where the photo was taken, read from its EXIF GPS tags (FR-06). */
export class PhotoLocationDto {
  latitude: number;

  longitude: number;

  /** Deprecated compatibility field; use PhotoMetadataDto.takenAt. */
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    example: '2026-08-20T14:02:11.000Z',
  })
  takenAt?: string | null;
}

export class PhotoMetadataDto {
  @ApiProperty({ type: PhotoLocationDto, nullable: true })
  location: PhotoLocationDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-08-20T14:02:11.000Z',
  })
  takenAt: string | null;
}

export class UploadPhotoResponseDto {
  /** Storage key to save in DISCOVERIES.image_object_key. */
  @ApiProperty({ example: 'photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg' })
  objectKey: string;

  /** Where the frontend fetches the image from. */
  @ApiProperty({
    example: '/api/photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg',
  })
  url: string;

  @ApiProperty({ type: PhotoMetadataDto })
  metadata: PhotoMetadataDto;

  /**
   * Null when the photo has no usable GPS tag — which must never block the
   * upload (FR-33 / NFR-33); the user places the pin manually instead.
   */
  @ApiProperty({ type: PhotoLocationDto, nullable: true })
  exif: PhotoLocationDto | null;
}
