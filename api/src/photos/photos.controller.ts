import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiQuery,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { UploadPhotoResponseDto } from './dto/upload-photo-response.dto';
import {
  ALLOWED_MIME_TYPES,
  MAX_PHOTO_BYTES,
  PhotosService,
} from './photos.service';

/**
 * Photos are uploaded before the discovery that references them exists, so this
 * is a standalone resource: upload returns a key, the client then posts that key
 * with the rest of the discovery.
 *
 * MinIO is never reached by clients directly (ADR-006, ADR-007) — everything
 * goes through here.
 *
 * Both routes require a bearer token (NFR-18, NFR-24). Note what that means for
 * a browser: `<img src="/api/photos/...">` cannot attach an Authorization
 * header, so a client has to fetch the bytes and render the resulting object
 * URL instead.
 */
@ApiTags('photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  @ApiAuthenticated()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
      // NFR-21, first gate: refuse the declared type before reading the body.
      // The real check is sharp's, in PhotosService.normalize().
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new UnsupportedMediaTypeException(
              `Unsupported file type "${file.mimetype}". Use JPEG, PNG or WebP.`,
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a discovery photo',
    description:
      'Stores the image in MinIO and returns its object key. EXIF metadata is ' +
      'read for the location, then stripped from the stored object.',
  })
  // The Swagger CLI plugin cannot infer a binary body — it has to be spelled out.
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadPhotoResponseDto })
  @ApiUnsupportedMediaTypeResponse({ description: 'Not a JPEG, PNG or WebP.' })
  @ApiPayloadTooLargeResponse({ description: 'Larger than 10 MB.' })
  upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadPhotoResponseDto> {
    if (!file) {
      throw new UnsupportedMediaTypeException('No file was uploaded.');
    }

    return this.photos.store(file);
  }

  @Get(':filename')
  @ApiAuthenticated()
  @ApiOperation({
    summary: 'Download a photo',
    description:
      'Proxies the object out of MinIO. MinIO publishes no port in production, ' +
      'so a presigned URL would not resolve for a client (ADR-007).',
  })
  @ApiOkResponse({ description: 'The image bytes.' })
  @ApiQuery({
    name: 'variant',
    required: false,
    enum: ['map', 'card', 'detail'],
    description:
      'Optional generated size. Older photos safely fall back to the original.',
  })
  @ApiNotFoundResponse({ description: 'No such photo.' })
  async download(
    @Param('filename') filename: string,
    @Query('variant') variant: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    // The global guard has established that the caller is signed in, which is
    // as far as authorization can go today.
    //
    // TODO(discoveries): personal discoveries are private by default
    // (NFR-24/25/26), so once the discoveries table exists this must also check
    // that *this* caller may see the discovery the photo belongs to. Until
    // then any signed-in user can read any key they know.
    const { stream, contentType, size } = await this.photos.read(
      filename,
      variant,
    );

    // Keys are immutable, so the bytes behind one never change. Set here rather
    // than with @Header(): Nest applies those before the handler runs, which
    // would put a year-long cache directive on the 404 as well.
    response.setHeader('Cache-Control', 'private, max-age=31536000, immutable');

    return new StreamableFile(stream, { type: contentType, length: size });
  }
}
