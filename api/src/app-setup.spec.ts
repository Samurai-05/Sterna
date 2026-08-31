import { INestApplication } from '@nestjs/common';
import { configureApp, corsOptions } from './app-setup';

jest.mock('./swagger', () => ({ setupSwagger: jest.fn() }));

describe('CORS configuration', () => {
  it('allows only the Capacitor Android origin with the API methods and headers it uses', () => {
    expect(corsOptions).toEqual({
      origin: ['https://localhost'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  });

  it('registers the policy on every configured application', () => {
    const enableCors = jest.fn();
    const app = {
      enableCors,
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
    } as unknown as INestApplication;

    configureApp(app);

    expect(enableCors).toHaveBeenCalledWith(corsOptions);
  });
});
