import { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types';
import { UploadPhotoResponseDto } from './../src/photos/dto/upload-photo-response.dto';
import { createTestApp, deleteTestUsers, registerTestUser } from './e2e-app';

/**
 * Exercises the real MinIO bucket, so it needs the whole stack up. Run it
 * inside the api container, where Compose already injects the environment:
 *
 *   docker compose exec api npm run test:e2e
 */
describe('PhotosController (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  /** `Authorization: Bearer <token>` for the account registered in beforeAll. */
  const auth = (): string => `Bearer ${accessToken}`;

  const jpeg = (exif?: sharp.Exif): Promise<Buffer> => {
    const pipeline = sharp({
      create: { width: 16, height: 16, channels: 3, background: 'red' },
    });

    return (exif ? pipeline.withExif(exif) : pipeline).jpeg().toBuffer();
  };

  beforeAll(async () => {
    app = await createTestApp();
    // Both photo routes are behind the global guard now (NFR-18), so every
    // request below needs a caller.
    ({ accessToken } = await registerTestUser(app));
  });

  afterAll(async () => {
    await deleteTestUsers(app);
    await app.close();
  });

  it('stores an upload and serves it back', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/photos')
      .set('Authorization', auth())
      .attach('file', await jpeg(), { filename: 'photo.jpg' })
      .expect(201);

    const body = upload.body as UploadPhotoResponseDto;

    expect(body.objectKey).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/);
    expect(body.exif).toBeNull();

    await request(app.getHttpServer())
      .get(body.url)
      .set('Authorization', auth())
      .expect(200)
      .expect('Content-Type', 'image/jpeg')
      .expect('Cache-Control', 'private, max-age=31536000, immutable');
  });

  // FR-06
  it('returns the capture location of a geotagged photo', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/photos')
      .set('Authorization', auth())
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
      .set('Authorization', auth())
      .attach('file', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(415);
  });

  it('refuses an image larger than 10 MB', async () => {
    await request(app.getHttpServer())
      .post('/api/photos')
      .set('Authorization', auth())
      .attach('file', Buffer.alloc(11 * 1024 * 1024), {
        filename: 'huge.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
  });

  it('404s an unknown photo, without a cache directive', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/photos/6f1c2a70-0d1e-4f0b-9d8e-2c4a1b3d5e6f.jpg')
      .set('Authorization', auth())
      .expect(404);

    // A cacheable 404 would survive the upload that fixes it.
    expect(response.headers['cache-control']).toBeUndefined();
  });

  // NFR-18: both routes moved behind the global guard when authentication
  // landed. A photo belongs to somebody's discovery, so an anonymous caller
  // has no business reaching either one.
  it('refuses an upload from a caller with no token', async () => {
    await request(app.getHttpServer())
      .post('/api/photos')
      .attach('file', await jpeg(), { filename: 'photo.jpg' })
      .expect(401);
  });

  it('refuses to serve a photo to a caller with no token', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/photos')
      .set('Authorization', auth())
      .attach('file', await jpeg(), { filename: 'photo.jpg' })
      .expect(201);

    const body = upload.body as UploadPhotoResponseDto;

    await request(app.getHttpServer()).get(body.url).expect(401);
  });

  /**
   * Being signed in was the whole of the authorization until now, with
   * randomUUID() key entropy standing in for the rest — and the key is not a
   * secret: DISCOVERY_PROJECTION hands it to every member of a shared group
   * map. So the answer has to depend on who is asking, and leaving a group
   * has to take the access with it.
   */
  describe('read authorization', () => {
    let stranger: string;

    beforeAll(async () => {
      ({ accessToken: stranger } = await registerTestUser(app));
    });

    const upload = async (token: string): Promise<UploadPhotoResponseDto> => {
      const response = await request(app.getHttpServer())
        .post('/api/photos')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', await jpeg(), { filename: 'photo.jpg' })
        .expect(201);

      return response.body as UploadPhotoResponseDto;
    };

    // 404, not 403: "that exists but is not yours" is the disclosure NFR-19
    // forbids, and it is what a key that does not exist answers too.
    it('hides a photo from a signed-in caller who has nothing to do with it', async () => {
      const photo = await upload(accessToken);

      await request(app.getHttpServer())
        .get(photo.url)
        .set('Authorization', `Bearer ${stranger}`)
        .expect(404);
    });

    it('opens it to a group co-member, and closes it again when they leave', async () => {
      const photo = await upload(accessToken);

      const groupResponse = await request(app.getHttpServer())
        .post('/api/groups')
        .set('Authorization', auth())
        .send({ name: 'Photo visibility' })
        .expect(201);
      const group = groupResponse.body as {
        id: string;
        inviteCode: string;
      };

      await request(app.getHttpServer())
        .post('/api/discoveries')
        .set('Authorization', auth())
        .send({
          groupId: group.id,
          title: 'Shared with the group',
          description: null,
          category: 'Other',
          longitude: 6.6412,
          latitude: 46.7785,
          imageObjectKey: photo.objectKey,
          discoveredAt: '2026-08-25T12:00:00.000Z',
        })
        .expect(201);

      // Still invisible: sharing it with a group the stranger is not in
      // changes nothing for them.
      await request(app.getHttpServer())
        .get(photo.url)
        .set('Authorization', `Bearer ${stranger}`)
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${stranger}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      await request(app.getHttpServer())
        .get(photo.url)
        .set('Authorization', `Bearer ${stranger}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/groups/${group.id}/members/me`)
        .set('Authorization', `Bearer ${stranger}`)
        .expect(204);

      // The point of the whole exercise: leaving revokes access to the
      // photos seen while inside, which key entropy never did.
      await request(app.getHttpServer())
        .get(photo.url)
        .set('Authorization', `Bearer ${stranger}`)
        .expect(404);
    });
  });
});
