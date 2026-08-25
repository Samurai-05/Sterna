import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';

interface HealthResponse {
  status: string;
  info: Record<string, { status: string }>;
}

/**
 * Boots the whole application, so it needs a reachable database and MinIO. Run
 * it inside the api container, where Compose already injects the environment:
 *
 *   docker compose exec api npm run test:e2e
 */
describe('HealthController (e2e)', () => {
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

  it('reports every dependency as up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    const body = response.body as HealthResponse;

    expect(body.status).toBe('ok');
    expect(body.info.database.status).toBe('up');
    expect(body.info.storage.status).toBe('up');
  });

  it('serves nothing outside the /api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
