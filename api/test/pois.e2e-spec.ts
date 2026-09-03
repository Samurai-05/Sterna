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
    const eiffelTower = body.find((poi) => poi.title === 'Eiffel Tower');
    // Same-origin proxy path, not a direct Wikimedia URL — see
    // PoisController.image / PoisService.getImage: a client on a
    // locked-down campus/lab network may not be able to reach Wikimedia
    // directly, but this server always can.
    expect(eiffelTower?.imageUrl).toMatch(/^\/api\/pois\/\d+\/image$/);
    expect(eiffelTower?.description).toContain(
      'Its design is credited to Stéphen Sauvestre.',
    );
    expect(eiffelTower?.description).not.toContain('Experiencing the place');
  });

  it('proxies the POI photo from Wikimedia rather than redirecting to it', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/pois')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const eiffelTower = (listResponse.body as PoiResponse[]).find(
      (poi) => poi.title === 'Eiffel Tower',
    );

    // No Authorization header: the image route is @Public() so a plain
    // <img src> (which cannot carry a bearer token) can load it.
    const imageResponse = await request(app.getHttpServer())
      .get(eiffelTower!.imageUrl!)
      .expect(200);

    expect(imageResponse.headers['content-type']).toMatch(/^image\//);
    expect((imageResponse.body as Buffer).length).toBeGreaterThan(0);
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

  it('unlocks a POI from a confirmed link even when the discovery is well outside the auto-unlock radius', async () => {
    // Trocadéro — roughly 700m from the Eiffel Tower, well outside
    // POI_DISCOVERY_RADIUS_METERS (150m).
    await dataSource.query(
      `INSERT INTO discoveries (
        user_id, title, location, image_object_key, discovered_at, is_personal, confirmed_poi_id
      )
      SELECT $1, 'Eiffel Tower from Trocadéro',
        ST_SetSRID(ST_MakePoint(2.2892, 48.8616), 4326), 'photos/trocadero.jpg',
        NOW(), TRUE, pois.id
      FROM pois WHERE pois.title = 'Eiffel Tower'`,
      [userId],
    );

    const response = await request(app.getHttpServer())
      .get('/api/pois/authored')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      (response.body as PoiResponse[]).find(
        (poi) => poi.title === 'Eiffel Tower',
      )?.discovered,
    ).toBe(true);
  });

  describe('GET /api/pois/nearby', () => {
    it('returns POIs within range, ordered by distance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/pois/nearby')
        .query({ longitude: 2.2892, latitude: 48.8616, radius: 2000 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PoiResponse[];
      expect(body.map((poi) => poi.title)).toContain('Eiffel Tower');
    });

    it('excludes POIs outside the requested radius', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/pois/nearby')
        .query({ longitude: 2.2892, latitude: 48.8616, radius: 100 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = response.body as PoiResponse[];
      expect(body.map((poi) => poi.title)).not.toContain('Eiffel Tower');
    });

    it('requires valid coordinates', async () => {
      await request(app.getHttpServer())
        .get('/api/pois/nearby')
        .query({ longitude: 'nope', latitude: 48.8616 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('excludes a close-range POI outside its own category radius even within a wide requested radius', async () => {
      // Notre-Dame (a cathedral, "sacred" category -> 1km radius) is
      // ~1.37km from the Louvre — outside its own radius even though this
      // asks for a much wider 20km search. Musée d'Orsay ("museum" -> 1km)
      // is only ~0.69km away, so it stays included.
      const response = await request(app.getHttpServer())
        .get('/api/pois/nearby')
        .query({ longitude: 2.33583, latitude: 48.86111, radius: 20000 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const titles = (response.body as PoiResponse[]).map((poi) => poi.title);
      expect(titles).not.toContain('Notre-Dame de Paris');
      expect(titles).toContain("Musée d'Orsay");
    });

    it('keeps a natural feature within its wider category radius (a mountain seen from the town below it)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/pois/nearby')
        // Zermatt village — the Matterhorn POI is ~8.5km away.
        .query({ longitude: 7.7491, latitude: 46.0207, radius: 20000 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        (response.body as PoiResponse[]).map((poi) => poi.title),
      ).toContain('Matterhorn');
    });

    it('still respects a caller-supplied radius smaller than the category radius', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/pois/nearby')
        .query({ longitude: 7.7491, latitude: 46.0207, radius: 5000 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        (response.body as PoiResponse[]).map((poi) => poi.title),
      ).not.toContain('Matterhorn');
    });
  });
});
