import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';
import { AuthResponseDto } from './../src/auth/dto/auth-response.dto';

/**
 * Shared bootstrap and fixtures for the end-to-end suites.
 *
 * Not a suite itself: jest-e2e.json matches `.e2e-spec.ts$`, which this file
 * deliberately does not.
 */

/** Every address this file mints, so the sweep below can find them all. */
const TEST_EMAIL_PATTERN = 'e2e-%@sterna.test';

/** Long enough for MIN_PASSWORD_LENGTH, and not a real person's password. */
export const TEST_PASSWORD = 'correct horse battery staple';

/**
 * Boots the real application through the real configureApp(), so the tests
 * exercise the routing, the validation pipe and the global guard the
 * application actually applies.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();

  configureApp(app);
  await app.init();

  return app;
}

/**
 * Registers a throwaway account through the real endpoint — argon2, the entity
 * and the unique index all get exercised — and returns its bearer token.
 *
 * The address is unique per call, because there is no truncation step and no
 * separate test database: a suite must never assume an empty table or depend
 * on a row another suite created.
 */
export async function registerTestUser(
  app: INestApplication<App>,
): Promise<AuthResponseDto> {
  // .test is the RFC 2606 reserved TLD, so nothing here is ever mailable.
  const email = `e2e-${randomUUID()}@sterna.test`;

  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, userName: 'E2E', password: TEST_PASSWORD })
    .expect(201);

  return response.body as AuthResponseDto;
}

/**
 * Removes every account registerTestUser can have created.
 *
 * Goes through the application's own connection, so it needs no configuration
 * of its own. A LIKE sweep rather than a list of ids: a run killed before its
 * afterAll would otherwise leak rows into a database nothing truncates. This
 * is a deliberate trade, not an oversight — the alternative is a separate test
 * database, which the project does not have.
 */
export async function deleteTestUsers(
  app: INestApplication<App>,
): Promise<void> {
  await app
    .get(DataSource)
    .query('DELETE FROM users WHERE email LIKE $1', [TEST_EMAIL_PATTERN]);
}
