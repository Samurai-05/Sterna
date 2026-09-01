import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import { UserDto } from './../src/auth/dto/user.dto';
import { UploadPhotoResponseDto } from './../src/photos/dto/upload-photo-response.dto';
import { PhotosService } from './../src/photos/photos.service';
import { GroupDetailDto } from './../src/groups/dto/group-detail.dto';
import { GroupRole } from './../src/groups/group-role';
import {
  TEST_PASSWORD,
  createTestApp,
  deleteTestUsers,
  registerTestUser,
} from './e2e-app';

/**
 * The first suite that writes rows, so every account it creates carries a
 * unique address and afterAll sweeps them. Needs the whole stack up:
 *
 *   docker compose exec api npm run test:e2e
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  const address = (): string => `e2e-${randomUUID()}@sterna.test`;

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/auth/register').send(body);

  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/auth/login').send(body);

  const jpeg = (): Promise<Buffer> =>
    sharp({ create: { width: 16, height: 16, channels: 3, background: 'red' } })
      .jpeg()
      .toBuffer();

  const uploadPhoto = async (accessToken: string) => {
    const upload = await request(app.getHttpServer())
      .post('/api/photos')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', await jpeg(), { filename: 'photo.jpg' })
      .expect(201);

    return (upload.body as UploadPhotoResponseDto).objectKey;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await deleteTestUsers(app);
    await app.close();
  });

  describe('registration', () => {
    // FR-01.
    it('creates an account and returns a token with it', async () => {
      const email = address();

      const response = await register({
        email,
        userName: 'Ada',
        password: TEST_PASSWORD,
      }).expect(201);

      const body = response.body as AuthResponseDto;

      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBeGreaterThan(0);
      expect(body.user).toEqual({
        id: expect.any(String) as string,
        email,
        userName: 'Ada',
        avatarObjectKey: null,
        createdAt: expect.any(String) as string,
      });
    });

    it('refuses a second registration of the same address', async () => {
      const email = address();
      const body = { email, userName: 'Ada', password: TEST_PASSWORD };

      await register(body).expect(201);
      await register(body).expect(409);
    });

    // The UNIQUE index compares bytes, so the API lower-cases before storing.
    it('refuses the same address in a different case', async () => {
      const email = address();

      await register({
        email,
        userName: 'Ada',
        password: TEST_PASSWORD,
      }).expect(201);
      await register({
        email: email.toUpperCase(),
        userName: 'Ada',
        password: TEST_PASSWORD,
      }).expect(409);
    });

    // OWASP ASVS 4.0 §2.1.1.
    it('refuses a password shorter than twelve characters', async () => {
      await register({
        email: address(),
        userName: 'Ada',
        password: 'short',
      }).expect(400);
    });

    it('refuses a registration with no user name', async () => {
      await register({ email: address(), password: TEST_PASSWORD }).expect(400);
    });

    // forbidNonWhitelisted: the frontend's confirmPassword field must not be
    // posted to this endpoint.
    it('refuses a body carrying a property the endpoint does not declare', async () => {
      await register({
        email: address(),
        userName: 'Ada',
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      }).expect(400);
    });
  });

  describe('login', () => {
    // FR-02.
    it('signs in with the registered credentials', async () => {
      const email = address();

      await register({
        email,
        userName: 'Ada',
        password: TEST_PASSWORD,
      }).expect(201);

      const response = await login({ email, password: TEST_PASSWORD }).expect(
        200,
      );

      expect((response.body as AuthResponseDto).accessToken).toEqual(
        expect.any(String),
      );
    });

    // NFR-18: the endpoint must not reveal whether an account exists.
    it('answers a wrong password and an unknown address identically', async () => {
      const email = address();

      await register({
        email,
        userName: 'Ada',
        password: TEST_PASSWORD,
      }).expect(201);

      const wrongPassword = await login({
        email,
        password: 'definitely not it',
      }).expect(401);

      const unknownAddress = await login({
        email: address(),
        password: TEST_PASSWORD,
      }).expect(401);

      expect(wrongPassword.body).toEqual(unknownAddress.body);
    });
  });

  describe('the current account', () => {
    // NFR-18.
    it('refuses a request with no authorization header', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('refuses a token signed with a different secret', async () => {
      const foreign = new JwtService({ secret: 'a'.repeat(48) });
      const token = await foreign.signAsync({ sub: '1', email: address() });

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('refuses a syntactically broken token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.jwt')
        .expect(401);
    });

    // FR-03.
    it('returns the caller profile for a valid token', async () => {
      const session = await registerTestUser(app);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(response.body).toEqual(session.user);
    });

    // NFR-18: the hash must never reach a response body, by any route.
    it('never puts the password hash in a register, login or profile response', async () => {
      const session = await registerTestUser(app);

      const signedIn = await login({
        email: session.user.email,
        password: TEST_PASSWORD,
      }).expect(200);

      const profile = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      for (const body of [session, signedIn.body, profile.body]) {
        expect(JSON.stringify(body)).not.toContain('argon2');
        expect(JSON.stringify(body)).not.toContain('passwordHash');
      }
    });
  });

  describe('profile updates', () => {
    // FR-03.
    it('renames the account and reflects it on the next read', async () => {
      const session = await registerTestUser(app);

      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ userName: 'Ada L.' })
        .expect(200);

      const profile = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect((profile.body as UserDto).userName).toBe('Ada L.');
    });

    it('refuses an update with nothing to update', async () => {
      const session = await registerTestUser(app);

      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({})
        .expect(400);
    });

    // FR-03: the photo pipeline is shared with discoveries, not a new upload path.
    it('sets the avatar from a previously uploaded photo', async () => {
      const session = await registerTestUser(app);
      const objectKey = await uploadPhoto(session.accessToken);

      const updated = await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ avatarObjectKey: objectKey })
        .expect(200);

      expect((updated.body as UserDto).avatarObjectKey).toBe(objectKey);

      const profile = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect((profile.body as UserDto).avatarObjectKey).toBe(objectKey);
    });

    // ADR-006: replacing the photo must not leave the old object behind in MinIO.
    it('frees the previous photo object once it is replaced', async () => {
      const session = await registerTestUser(app);
      const auth = `Bearer ${session.accessToken}`;
      const firstObjectKey = await uploadPhoto(session.accessToken);
      const firstFilename = firstObjectKey.split('/').at(-1);

      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', auth)
        .send({ avatarObjectKey: firstObjectKey })
        .expect(200);

      const secondObjectKey = await uploadPhoto(session.accessToken);

      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', auth)
        .send({ avatarObjectKey: secondObjectKey })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/photos/${firstFilename}`)
        .set('Authorization', auth)
        .expect(404);
    });

    it('removes the avatar on an explicit null', async () => {
      const session = await registerTestUser(app);
      const auth = `Bearer ${session.accessToken}`;
      const objectKey = await uploadPhoto(session.accessToken);

      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', auth)
        .send({ avatarObjectKey: objectKey })
        .expect(200);

      const cleared = await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', auth)
        .send({ avatarObjectKey: null })
        .expect(200);

      expect((cleared.body as UserDto).avatarObjectKey).toBeNull();
    });
  });

  describe('password changes', () => {
    // FR-02.
    it('changes the password, after which only the new one signs in', async () => {
      const session = await registerTestUser(app);
      const newPassword = 'a completely different passphrase';

      await request(app.getHttpServer())
        .patch('/api/auth/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD, newPassword })
        .expect(204);

      await login({
        email: session.user.email,
        password: newPassword,
      }).expect(200);
      await login({
        email: session.user.email,
        password: TEST_PASSWORD,
      }).expect(401);
    });

    /**
     * ADR-009 originally accepted that a password change invalidated no
     * outstanding token, which made "I think I was compromised, let me change
     * my password" a no-op for up to seven days. JwtAuthGuard now compares
     * each token's own `iat` against users.password_changed_at.
     */
    it("rejects every token issued before the change, the caller's included", async () => {
      const session = await registerTestUser(app);
      const auth = `Bearer ${session.accessToken}`;

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', auth)
        .expect(200);

      // `iat` has second precision, so a change in the same second as the
      // registration would be indistinguishable from it. One second of
      // separation is what makes the assertion mean something.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await request(app.getHttpServer())
        .patch('/api/auth/password')
        .set('Authorization', auth)
        .send({
          currentPassword: TEST_PASSWORD,
          newPassword: 'yet another different passphrase',
        })
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', auth)
        .expect(401);

      // Signing in again works, and the fresh token does not inherit the
      // rejection.
      const renewed = await login({
        email: session.user.email,
        password: 'yet another different passphrase',
      }).expect(200);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(
          'Authorization',
          `Bearer ${(renewed.body as AuthResponseDto).accessToken}`,
        )
        .expect(200);
    });

    // A body value failed, not the token — so 400, and 401 keeps meaning
    // "your session is over".
    it('refuses a change whose current password is wrong, with 400 not 401', async () => {
      const session = await registerTestUser(app);

      await request(app.getHttpServer())
        .patch('/api/auth/password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          currentPassword: 'definitely not it',
          newPassword: 'a completely different passphrase',
        })
        .expect(400);
    });
  });

  describe('account deletion', () => {
    // FR-01.
    it('deletes the account, after which its credentials no longer sign in', async () => {
      const session = await registerTestUser(app);

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD })
        .expect(204);

      await login({
        email: session.user.email,
        password: TEST_PASSWORD,
      }).expect(401);
    });

    // The token outlives the row, because the guard never reads the database.
    it('answers 401 to a token whose account has been deleted', async () => {
      const session = await registerTestUser(app);

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD })
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
    });

    // Every object the account owns goes with it (ADR-006), the avatar
    // included — it is a photos row like any other.
    it("frees the account's avatar object", async () => {
      const session = await registerTestUser(app);
      const auth = `Bearer ${session.accessToken}`;
      const objectKey = await uploadPhoto(session.accessToken);

      await request(app.getHttpServer())
        .patch('/api/auth/me')
        .set('Authorization', auth)
        .send({ avatarObjectKey: objectKey })
        .expect(200);

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Authorization', auth)
        .send({ currentPassword: TEST_PASSWORD })
        .expect(204);

      // Asked of MinIO directly rather than through GET /api/photos: the
      // token is now rejected at the guard, since its account is gone, and
      // no other account may read the key either (photo downloads are
      // authorized, not merely authenticated).
      await expect(app.get(PhotosService).exists(objectKey)).resolves.toBe(
        false,
      );
    });

    it('refuses a deletion whose current password is wrong', async () => {
      const session = await registerTestUser(app);

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: 'definitely not it' })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);
    });

    // A group must not survive its owner ownerless (uq_group_members_one_owner_per_group
    // permits zero, but nothing else should have to notice).
    it('hands a deleted owner’s group to its longest-tenured other member', async () => {
      const owner = await registerTestUser(app);
      const member = await registerTestUser(app);

      const createResponse = await request(app.getHttpServer())
        .post('/api/groups')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Handed off' })
        .expect(201);
      const group = createResponse.body as GroupDetailDto;

      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${member.accessToken}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD })
        .expect(204);

      const detail = await request(app.getHttpServer())
        .get(`/api/groups/${group.id}`)
        .set('Authorization', `Bearer ${member.accessToken}`)
        .expect(200);

      expect((detail.body as GroupDetailDto).role).toBe(GroupRole.Owner);
    });

    it('dissolves a deleted owner’s group when they were its only member', async () => {
      const owner = await registerTestUser(app);
      const outsider = await registerTestUser(app);

      const createResponse = await request(app.getHttpServer())
        .post('/api/groups')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Solo' })
        .expect(201);
      const group = createResponse.body as GroupDetailDto;

      await request(app.getHttpServer())
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ currentPassword: TEST_PASSWORD })
        .expect(204);

      // The invitation code no longer resolves to anything (NO_SUCH_INVITE_CODE).
      await request(app.getHttpServer())
        .post('/api/groups/join')
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ inviteCode: group.inviteCode })
        .expect(404);
    });
  });

  // The @Public() boundary: the Compose healthcheck carries no token.
  it('serves the health endpoint without a token', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
