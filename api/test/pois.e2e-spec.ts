import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';

interface PoiResponse {
  id: string;
  title: string;
  description: string | null;
  longitude: number;
  latitude: number;
  imageUrl: string | null;
  discovered: boolean;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string };
}

describe('PoisController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM users WHERE email = 'pois-e2e@sterna.local'`,
    );
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'pois-e2e@sterna.local',
        password: 'password-123',
        userName: 'POIs E2E',
      });
    const auth = response.body as AuthResponse;
    accessToken = auth.accessToken;
    userId = auth.user.id;
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM users WHERE email = 'pois-e2e@sterna.local'`,
    );
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/pois').expect(401);
    await request(app.getHttpServer()).get('/api/pois/authored').expect(401);
  });

  it('lists at least one seeded point of interest per MVP country', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pois')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as PoiResponse[];

    expect(body.length).toBeGreaterThanOrEqual(195);
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Eiffel Tower',
          longitude: 2.29448,
          latitude: 48.8583,
          discovered: false,
        }),
      ]),
    );
    expect(
      body.find((poi) => poi.title === 'Eiffel Tower')?.imageUrl,
    ).toContain('commons.wikimedia.org');
    expect(
      body.find((poi) => poi.title === 'Eiffel Tower')?.description,
    ).toContain('Its design is credited to Stéphen Sauvestre.');
    expect(
      body.find((poi) => poi.title === 'Eiffel Tower')?.description,
    ).not.toContain('Experiencing the place');
  });

  it('keeps map status isolated while user status includes group discoveries', async () => {
    await dataSource.query(`DELETE FROM groups WHERE name = 'POI test group'`);
    const [{ id: groupId }] = await dataSource.query<{ id: string }[]>(
      `INSERT INTO groups (name, invite_code) VALUES ('POI test group', 'POI-E2E-CODE') RETURNING id`,
    );
    await dataSource.query(
      `INSERT INTO group_members (user_id, group_id, role) VALUES ($1, $2, 'member')`,
      [userId, groupId],
    );
    await dataSource.query(
      `INSERT INTO discoveries (
        user_id, group_id, title, location, image_object_key, discovered_at
      ) VALUES ($1, $2, 'Group Eiffel Tower', ST_SetSRID(ST_MakePoint(2.2945, 48.8584), 4326), 'photos/eiffel-group.jpg', NOW())`,
      [userId, groupId],
    );

    const personalResponse = await request(app.getHttpServer())
      .get('/api/pois')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (personalResponse.body as PoiResponse[]).find(
        (poi) => poi.title === 'Eiffel Tower',
      )?.discovered,
    ).toBe(false);

    const authoredResponse = await request(app.getHttpServer())
      .get('/api/pois/authored')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (authoredResponse.body as PoiResponse[]).find(
        (poi) => poi.title === 'Eiffel Tower',
      )?.discovered,
    ).toBe(true);

    await dataSource.query(
      `INSERT INTO discoveries (
        user_id, title, location, image_object_key, discovered_at, is_personal
      ) VALUES ($1, 'Near Eiffel Tower', ST_SetSRID(ST_MakePoint(2.2945, 48.8584), 4326), 'photos/eiffel.jpg', NOW(), TRUE)`,
      [userId],
    );

    const response = await request(app.getHttpServer())
      .get('/api/pois')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as PoiResponse[];

    expect(body.find((poi) => poi.title === 'Eiffel Tower')?.discovered).toBe(
      true,
    );
  });
});
