import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SWAGGER_JSON_PATH, SWAGGER_PATH } from './../src/swagger';
import { createTestApp } from './e2e-app';

interface OpenApiDocument {
  openapi: string;
  info: { title: string };
  paths: Record<
    string,
    Record<string, { tags?: string[]; security?: Record<string, string[]>[] }>
  >;
  components: { securitySchemes?: Record<string, { scheme?: string }> };
}

/**
 * Boots the whole application, so it needs a reachable database:
 *
 *   docker compose exec api npm run test:e2e
 */
describe('OpenAPI documentation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
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
  });

  // The published document is what the frontend team builds against, so the
  // bearer scheme and the routes that need it have to be in it.
  it('declares the bearer security scheme', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${SWAGGER_JSON_PATH}`)
      .expect(200);

    const document = response.body as OpenApiDocument;

    expect(document.components.securitySchemes?.bearer.scheme).toBe('bearer');
  });

  it('documents the authentication endpoints', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${SWAGGER_JSON_PATH}`)
      .expect(200);

    const document = response.body as OpenApiDocument;

    expect(document.paths['/api/auth/login'].post.tags).toContain('auth');
    expect(document.paths['/api/auth/register'].post.tags).toContain('auth');
    // A protected route that does not say it is protected is a bug.
    expect(document.paths['/api/auth/me'].get.security).toContainEqual({
      bearer: [],
    });
  });
});
