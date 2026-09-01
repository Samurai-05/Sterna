import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import sharp from 'sharp';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';
import { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import { UploadPhotoResponseDto } from './../src/photos/dto/upload-photo-response.dto';

/**
 * Shared bootstrap and fixtures for the end-to-end suites.
 *
 * Not a suite itself: jest-e2e.json matches `.e2e-spec.ts$`, which this file
 * deliberately does not.
 */

/** Every address any suite mints, so the stale sweep below can find them all. */
const ANY_TEST_EMAIL = 'e2e-%@sterna.test';

/**
 * Jest gives each test *file* its own module registry, so this constant is
 * unique per suite — and suites run in parallel workers against one shared
 * database.
 *
 * That is the whole reason it exists. A sweep of every `e2e-%@sterna.test`
 * address in one suite's afterAll deletes the accounts another suite is
 * halfway through using, which surfaces as an unrelated 500 in whichever suite
 * happens to still be running. Scoping the pattern to the suite that minted
 * the rows is what makes the suites independent of each other's timing.
 *
 * Truncated, and it has to stay short. RFC 5321 caps an address's local part
 * at 64 characters and @IsEmail() enforces it, so `e2e-` + this + `-` + a full
 * UUID has to fit: a whole UUID here overflows that and every registration in
 * every suite comes back 400.
 */
const SUITE_ID = randomUUID().slice(0, 8);

/** The addresses this suite mints, and the only ones it will delete. */
const SUITE_EMAIL_PATTERN = `e2e-${SUITE_ID}-%@sterna.test`;

/**
 * How old another suite's leftovers must be before this one clears them.
 *
 * A run killed before its afterAll leaks rows into a database nothing
 * truncates, and per-suite patterns alone would never collect them. An hour is
 * far longer than any suite lives, so this cannot reach a run in progress.
 */
const STALE_AFTER = '1 hour';

/** Long enough for MIN_PASSWORD_LENGTH, and not a real person's password. */
export const TEST_PASSWORD = 'correct horse battery staple';

/**
 * Boots the real application through the real configureApp(), so the tests
 * exercise the routing, the validation pipe and the global guard the
 * application actually applies.
 *
 * Also collects whatever an earlier interrupted run left behind.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();

  configureApp(app);
  await app.init();

  await deleteAccounts(app, ANY_TEST_EMAIL, STALE_AFTER);

  return app;
}

/**
 * Registers a throwaway account through the real endpoint — argon2, the entity
 * and the unique index all get exercised — and returns its bearer token.
 *
 * The address is unique per call and carries the suite's id, because there is
 * no truncation step and no separate test database: a suite must never assume
 * an empty table, depend on a row another suite created, or delete one.
 */
export async function registerTestUser(
  app: INestApplication<App>,
): Promise<AuthResponseDto> {
  // .test is the RFC 2606 reserved TLD, so nothing here is ever mailable.
  const email = `e2e-${SUITE_ID}-${randomUUID()}@sterna.test`;

  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, userName: 'E2E', password: TEST_PASSWORD })
    .expect(201);

  return response.body as AuthResponseDto;
}

/** Creates one real canonical photo for discovery-creation e2e fixtures. */
export async function uploadTestPhoto(
  app: INestApplication<App>,
  accessToken: string,
): Promise<string> {
  const buffer = await sharp({
    create: { width: 8, height: 8, channels: 3, background: 'red' },
  })
    .jpeg()
    .toBuffer();
  const response = await request(app.getHttpServer())
    .post('/api/photos')
    .set('Authorization', `Bearer ${accessToken}`)
    .attach('file', buffer, { filename: 'discovery-fixture.jpg' })
    .expect(201);

  return (response.body as { objectKey: string }).objectKey;
}

/** Removes every account *this suite* created, and the groups that were only theirs. */
export async function deleteTestUsers(
  app: INestApplication<App>,
): Promise<void> {
  await deleteAccounts(app, SUITE_EMAIL_PATTERN, '0 seconds');
}

/**
 * Uploads a real photo and returns its object key.
 *
 * A discovery can no longer cite an invented key: POST /api/discoveries checks
 * that the caller uploaded the object and that it is really in MinIO, because
 * a key is published to every member of a shared group map and citing one
 * therefore proves nothing. Suites that need a discovery have to go through
 * the upload endpoint the same way a client does.
 */
export async function uploadTestPhoto(
  app: INestApplication<App>,
  accessToken: string,
): Promise<string> {
  const bytes = await sharp({
    create: { width: 16, height: 16, channels: 3, background: 'red' },
  })
    .jpeg()
    .toBuffer();

  const response = await request(app.getHttpServer())
    .post('/api/photos')
    .set('Authorization', `Bearer ${accessToken}`)
    .attach('file', bytes, { filename: 'photo.jpg' })
    .expect(201);

  return (response.body as UploadPhotoResponseDto).objectKey;
}

/**
 * Deletes the accounts matching `pattern` that are older than `minimumAge`,
 * along with their discoveries and the groups left with no one but them.
 *
 * The three statements have to run in this order. `DELETE FROM users` cascades
 * to group_members, and fk_discoveries_group_membership is ON DELETE RESTRICT
 * — so an account that recorded a single group discovery would otherwise make
 * the sweep fail in afterAll rather than in a test.
 */
async function deleteAccounts(
  app: INestApplication<App>,
  pattern: string,
  minimumAge: string,
): Promise<void> {
  const dataSource = app.get(DataSource);
  const parameters = [pattern, minimumAge];

  await dataSource.query(
    `DELETE FROM discoveries
      WHERE user_id IN (
            SELECT id FROM users
             WHERE email LIKE $1 AND created_at < NOW() - $2::interval)`,
    parameters,
  );

  // Only groups whose entire membership is in scope, so a sweep can never take
  // a group that a developer — or a suite still running — has a stake in. Runs
  // before the accounts are deleted, because that membership is what
  // identifies them.
  await dataSource.query(
    `DELETE FROM groups g
      WHERE EXISTS (
              SELECT 1 FROM group_members m
                JOIN users u ON u.id = m.user_id
               WHERE m.group_id = g.id
                 AND u.email LIKE $1
                 AND u.created_at < NOW() - $2::interval)
        AND NOT EXISTS (
              SELECT 1 FROM group_members m
                JOIN users u ON u.id = m.user_id
               WHERE m.group_id = g.id
                 AND NOT (u.email LIKE $1
                          AND u.created_at < NOW() - $2::interval))`,
    parameters,
  );

  await dataSource.query(
    `DELETE FROM users
      WHERE email LIKE $1 AND created_at < NOW() - $2::interval`,
    parameters,
  );
}
