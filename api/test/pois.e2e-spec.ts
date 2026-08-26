import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';

interface PoiResponse {
  id: string;
  title: string;
  description: string | null;
  longitude: number;
  latitude: number;
  imageUrl: string | null;
}

describe('PoisController (e2e)', () => {
  let app: INestApplication<App>;

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

  it('lists seeded points of interest with PostGIS coordinates', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pois')
      .expect(200);

    const body = response.body as PoiResponse[];

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Eiffel Tower',
          longitude: 2.2945,
          latitude: 48.8584,
        }),
      ]),
    );
  });
});
