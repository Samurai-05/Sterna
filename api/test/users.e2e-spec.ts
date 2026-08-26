import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureApp } from './../src/app-setup';
import { AppModule } from './../src/app.module';

interface UserResponse {
  id: string;
  email: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  password?: string;
  passwordHash?: string;
}

describe('UsersController (e2e)', () => {
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
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM users WHERE email = 'users-e2e@sterna.local'`,
    );
    await app.close();
  });

  it('creates a user without exposing password data', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: 'users-e2e@sterna.local',
        password: 'password-123',
        userName: 'Users E2E',
      })
      .expect(201);

    const body = response.body as UserResponse;

    expect(body).toEqual(
      expect.objectContaining({
        email: 'users-e2e@sterna.local',
        userName: 'Users E2E',
      }),
    );
    expect(body.password).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it('rejects duplicate emails', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .send({
        email: 'users-e2e@sterna.local',
        password: 'password-123',
        userName: 'Users E2E Duplicate',
      })
      .expect(409);
  });
});
