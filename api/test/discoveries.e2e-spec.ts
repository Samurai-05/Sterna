import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';

interface DiscoveryResponse {
  id: string;
  userId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  longitude: number;
  latitude: number;
  imageObjectKey: string;
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM users WHERE email = 'discoveries-e2e@sterna.local'`,
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
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM users WHERE email = 'discoveries-e2e@sterna.local'`,
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
        imageObjectKey: 'discoveries/e2e-lake.jpg',
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
        imageObjectKey: 'discoveries/e2e-lake.jpg',
        discoveredAt: '2026-08-25T12:00:00.000Z',
      }),
    );
  });

  it('lists discoveries with PostGIS coordinates', async () => {
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
        imageObjectKey: 'discoveries/e2e-listed.jpg',
        discoveredAt: '2026-08-25T13:00:00.000Z',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/discoveries')
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
          imageObjectKey: 'discoveries/e2e-listed.jpg',
          discoveredAt: '2026-08-25T13:00:00.000Z',
        }),
      ]),
    );
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
