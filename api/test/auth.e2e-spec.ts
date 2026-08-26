import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    userName: string;
    password?: string;
    passwordHash?: string;
  };
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);

    await request(app.getHttpServer()).post('/api/users').send({
      email: 'auth-e2e@sterna.local',
      password: 'password-123',
      userName: 'Auth E2E',
    });
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM users WHERE email = 'auth-e2e@sterna.local'`,
    );
    await app.close();
  });

  it('logs in with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'auth-e2e@sterna.local',
        password: 'password-123',
      })
      .expect(201);

    const body = response.body as LoginResponse;

    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user).toEqual(
      expect.objectContaining({
        email: 'auth-e2e@sterna.local',
        userName: 'Auth E2E',
      }),
    );
    expect(body.user.password).toBeUndefined();
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('returns the current user from a valid bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'auth-e2e@sterna.local',
        password: 'password-123',
      })
      .expect(201);
    const body = loginResponse.body as LoginResponse;

    const meResponse = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);

    expect(meResponse.body).toEqual(
      expect.objectContaining({
        id: body.user.id,
        email: 'auth-e2e@sterna.local',
        userName: 'Auth E2E',
      }),
    );
    expect(meResponse.body.password).toBeUndefined();
    expect(meResponse.body.passwordHash).toBeUndefined();
  });

  it('rejects current user requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);
  });

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'auth-e2e@sterna.local',
        password: 'wrong-password',
      })
      .expect(401);
  });
});
