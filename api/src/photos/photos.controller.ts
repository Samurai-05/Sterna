import {
  Controller,
  Get,
  NotFoundException,
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
import { Throttle } from '@nestjs/throttler';
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
import { UPLOAD_THROTTLE } from '../config/throttling';
import type { AuthenticatedUser } from '../common/authenticated-user';
import { ApiAuthenticated } from '../common/decorators/api-authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UploadPhotoResponseDto } from './dto/upload-photo-response.dto';
import {
  ALLOWED_MIME_TYPES,
  MAX_PHOTO_BYTES,
  PhotosService,
  photoObjectKey,
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
  // 10 MB buffered in memory and decoded through sharp twice per request, so
  // this is the most expensive route in the API by a wide margin.
  @Throttle({ default: UPLOAD_THROTTLE })
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
    @CurrentUser() caller: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadPhotoResponseDto> {
    if (!file) {
      throw new UnsupportedMediaTypeException('No file was uploaded.');
    }

    return this.photos.store(caller.id, file);
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
  @ApiNotFoundResponse({
    description: 'No such photo, or not one this caller may see.',
  })
  async download(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('filename') filename: string,
    @Query('variant') variant: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    // Being signed in is not enough (NFR-24/25/26): a personal discovery is
    // private by default, and key entropy is obscurity, not authorization —
    // every member of a shared group map is handed the key in full.
    //
    // 404 rather than 403, matching the groups module: telling an outsider
    // "that exists but is not yours" is the disclosure NFR-19 forbids. It is
    // also the answer read() gives for a key that does not exist, so the two
    // cases stay indistinguishable.
    //
    // Authorised on the canonical key: `variant` only picks which rendition of
    // the same photo is streamed, so it cannot widen what the caller may see.
    if (!(await this.photos.canRead(caller.id, photoObjectKey(filename)))) {
      throw new NotFoundException(`Unknown photo "${filename}".`);
    }

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
