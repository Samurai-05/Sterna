import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';
import { uploadTestPhoto } from './e2e-app';

interface DiscoveryResponse {
  id: string;
  userId: string;
  groupId: string | null;
  groupIds: string[];
  title: string;
  description: string | null;
  category: string | null;
  longitude: number;
  latitude: number;
  imageObjectKey: string;
  countryCode: string | null;
  discoveredAt: string;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string };
}

describe('DiscoveriesController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userId: string;
  let accessToken: string;
  let otherUserId: string;
  let otherAccessToken: string;
  let photoKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM users WHERE email IN (
        'discoveries-e2e@sterna.local',
        'discoveries-other-e2e@sterna.local'
      )`,
    );

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'discoveries-e2e@sterna.local',
        password: 'password-123',
        userName: 'Discoveries E2E',
      });

    const body = registerResponse.body as AuthResponse;

    userId = body.user.id;
    accessToken = body.accessToken;
    photoKey = await uploadTestPhoto(app, accessToken);

    const otherRegisterResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'discoveries-other-e2e@sterna.local',
        password: 'password-123',
        userName: 'Other Discoveries E2E',
      });

    const otherBody = otherRegisterResponse.body as AuthResponse;
    otherUserId = otherBody.user.id;
    otherAccessToken = otherBody.accessToken;
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM users WHERE email IN (
        'discoveries-e2e@sterna.local',
        'discoveries-other-e2e@sterna.local'
      )`,
    );
    await app.close();
  });

  it('creates a personal discovery with a PostGIS point', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/discoveries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        groupId: null,
        title: 'Vue sur le lac',
        description: 'Balade du dimanche',
        category: 'Landscape',
        longitude: 6.6412,
        latitude: 46.7785,
        imageObjectKey: photoKey,
        locationSource: 'manual',
        discoveredAt: '2026-08-25T12:00:00.000Z',
      })
      .expect(201);

    const body = response.body as DiscoveryResponse;

    expect(body).toEqual(
      expect.objectContaining({
        userId,
        groupId: null,
        title: 'Vue sur le lac',
        category: 'Landscape',
        longitude: 6.6412,
        latitude: 46.7785,
        imageObjectKey: photoKey,
        locationSource: 'manual',
        discoveredAt: '2026-08-25T12:00:00.000Z',
      }),
    );
    // Lausanne — real PostGIS containment (issue #59), not a stub.
    expect(body.countryCode).toBe('CHE');
  });

  // A coastal point close enough to land that it's clearly not open ocean,
  // but which the simplified boundary polygon doesn't actually contain —
  // the bug this migration fixes (a discovery near the Sardinian coast used
  // to leave Italy permanently marked unexplored on the map).
  it('assigns the nearest country to a discovery just outside its coastline polygon', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/discoveries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        groupId: null,
        title: 'Phi Beach',
        description: null,
        category: 'Landscape',
        longitude: 9.4669802,
        latitude: 41.1418826,
        imageObjectKey: photoKey,
        locationSource: 'manual',
        discoveredAt: '2026-08-25T12:00:00.000Z',
      })
      .expect(201);

    const body = response.body as DiscoveryResponse;

    expect(body.countryCode).toBe('ITA');
  });

  it('lists only the caller discoveries with PostGIS coordinates', async () => {
    await request(app.getHttpServer())
      .post('/api/discoveries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        groupId: null,
        title: 'Listed discovery',
        description: null,
        category: 'Other',
        longitude: 7.4474,
        latitude: 46.948,
        imageObjectKey: photoKey,
        locationSource: 'manual',
        discoveredAt: '2026-08-25T13:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/discoveries')
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({
        groupId: null,
        title: 'Another user discovery',
        description: null,
        category: 'Other',
        longitude: 2.3522,
        latitude: 48.8566,
        imageObjectKey: photoKey,
        locationSource: 'manual',
        discoveredAt: '2026-08-25T14:00:00.000Z',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/discoveries')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as DiscoveryResponse[];

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId,
          title: 'Listed discovery',
          category: 'Other',
          longitude: 7.4474,
          latitude: 46.948,
          imageObjectKey: photoKey,
          locationSource: 'manual',
          discoveredAt: '2026-08-25T13:00:00.000Z',
        }),
      ]),
    );
    expect(body.every((discovery) => discovery.userId === userId)).toBe(true);
    expect(body.some((discovery) => discovery.userId === otherUserId)).toBe(
      false,
    );
    expect(
      body.some((discovery) => discovery.title === 'Another user discovery'),
    ).toBe(false);
  });

  it('rejects discovery listing without a bearer token', async () => {
    await request(app.getHttpServer()).get('/api/discoveries').expect(401);
  });

  it('lets only the owner read, update and delete a discovery', async () => {
    const createdResponse = await request(app.getHttpServer())
      .post('/api/discoveries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        groupId: null,
        title: 'Private discovery',
        description: 'Before update',
        category: 'Landscape',
        longitude: 6.5,
        latitude: 46.5,
        imageObjectKey: photoKey,
        locationSource: 'manual',
        discoveredAt: '2026-08-25T15:00:00.000Z',
      })
      .expect(201);

    const created = createdResponse.body as DiscoveryResponse;

    await request(app.getHttpServer())
      .get(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({ title: 'Stolen discovery' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);

    const updatedResponse = await request(app.getHttpServer())
      .patch(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated private discovery',
        description: null,
        category: 'Culture',
        longitude: 7.1,
        latitude: 47.1,
      })
      .expect(200);

    expect(updatedResponse.body).toEqual(
      expect.objectContaining({
        id: created.id,
        userId,
        title: 'Updated private discovery',
        description: null,
        category: 'Culture',
        longitude: 7.1,
        latitude: 47.1,
      }),
    );

    await request(app.getHttpServer())
      .get(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }: { body: DiscoveryResponse }) => {
        expect(body.title).toBe('Updated private discovery');
      });

    await request(app.getHttpServer())
      .delete(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/discoveries/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('rejects detail, update and deletion without a bearer token', async () => {
    await request(app.getHttpServer()).get('/api/discoveries/1').expect(401);
    await request(app.getHttpServer())
      .patch('/api/discoveries/1')
      .send({ title: 'Unauthorized update' })
      .expect(401);
    await request(app.getHttpServer()).delete('/api/discoveries/1').expect(401);
  });

  it('rejects discovery creation without a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/api/discoveries')
      .send({
        groupId: null,
        title: 'Unauthorized discovery',
        category: 'Other',
        longitude: 7.4474,
        latitude: 46.948,
        imageObjectKey: 'discoveries/e2e-unauthorized.jpg',
        discoveredAt: '2026-08-25T13:00:00.000Z',
      })
      .expect(401);
  });
});
