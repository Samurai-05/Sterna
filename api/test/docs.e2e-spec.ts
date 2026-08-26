import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';
import { SWAGGER_JSON_PATH, SWAGGER_PATH } from './../src/swagger';

interface OpenApiDocument {
  openapi: string;
  info: { title: string };
  paths: Record<string, Record<string, { tags?: string[] }>>;
}

/**
 * Boots the whole application, so it needs a reachable database:
 *
 *   docker compose exec api npm run test:e2e
 */
describe('OpenAPI documentation (e2e)', () => {
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

  it('serves the Swagger UI', async () => {
    await request(app.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(200);
  });

  it('describes the documented endpoints in the OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${SWAGGER_JSON_PATH}`)
      .expect(200);

    const document = response.body as OpenApiDocument;

    expect(document.openapi).toMatch(/^3\./);
    expect(document.info.title).toBe('Sterna API');
    expect(document.paths['/api/auth/login'].post.tags).toContain('auth');
    expect(document.paths['/api/discoveries'].post.tags).toContain(
      'discoveries',
    );
    expect(document.paths['/api/health'].get.tags).toContain('health');
    expect(document.paths['/api/pois'].get.tags).toContain('pois');
    expect(document.paths['/api/users'].post.tags).toContain('users');
  });
});
