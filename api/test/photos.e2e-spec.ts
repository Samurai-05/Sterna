import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';
import { UploadPhotoResponseDto } from './../src/photos/dto/upload-photo-response.dto';

/**
 * Exercises the real MinIO bucket, so it needs the whole stack up. Run it
 * inside the api container, where Compose already injects the environment:
 *
 *   docker compose exec api npm run test:e2e
 */
describe('PhotosController (e2e)', () => {
  let app: INestApplication<App>;

  const jpeg = (exif?: sharp.Exif): Promise<Buffer> => {
    const pipeline = sharp({
      create: { width: 16, height: 16, channels: 3, background: 'red' },
    });

    return (exif ? pipeline.withExif(exif) : pipeline).jpeg().toBuffer();
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores an upload and serves it back', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/photos')
      .attach('file', await jpeg(), { filename: 'photo.jpg' })
      .expect(201);

    const body = upload.body as UploadPhotoResponseDto;

    expect(body.objectKey).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/);
    expect(body.exif).toBeNull();

    await request(app.getHttpServer())
      .get(body.url)
      .expect(200)
      .expect('Content-Type', 'image/jpeg')
      .expect('Cache-Control', 'private, max-age=31536000, immutable');
  });

  // FR-06
  it('returns the capture location of a geotagged photo', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/photos')
      .attach(
        'file',
        await jpeg({
          // IFD2 is the Exif sub-IFD, IFD3 the GPS one.
          IFD2: { DateTimeOriginal: '2026:08:20 14:02:11' },
          IFD3: {
            GPSLatitudeRef: 'N',
            GPSLatitude: '46/1 47/1 0/1',
            GPSLongitudeRef: 'E',
            GPSLongitude: '6/1 38/1 0/1',
          },
        }),
        { filename: 'photo.jpg' },
      )
      .expect(201);

    const body = upload.body as UploadPhotoResponseDto;

    expect(body.exif?.latitude).toBeCloseTo(46.783, 3);
    expect(body.exif?.longitude).toBeCloseTo(6.633, 3);
  });

  // NFR-21
  it('refuses a file that is not an image', async () => {
    await request(app.getHttpServer())
      .post('/api/photos')
      .attach('file', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(415);
  });

  it('refuses an image larger than 10 MB', async () => {
    await request(app.getHttpServer())
      .post('/api/photos')
      .attach('file', Buffer.alloc(11 * 1024 * 1024), {
        filename: 'huge.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
  });

  it('404s an unknown photo, without a cache directive', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg')
      .expect(404);

    // A cacheable 404 would survive the upload that fixes it.
    expect(response.headers['cache-control']).toBeUndefined();
  });
});
