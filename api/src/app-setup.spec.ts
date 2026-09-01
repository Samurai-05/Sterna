import { INestApplication } from '@nestjs/common';
import { configureApp, corsOptions } from './app-setup';
import { setupSwagger } from './swagger';

jest.mock('./swagger', () => ({ setupSwagger: jest.fn() }));

/**
 * configureApp() reaches for the Express instance to set `trust proxy`, so the
 * stub has to answer getHttpAdapter() as well as the Nest-level calls.
 */
function stubApp(): {
  app: INestApplication;
  enableCors: jest.Mock;
  set: jest.Mock;
  use: jest.Mock;
} {
  const enableCors = jest.fn();
  const set = jest.fn();
  const use = jest.fn();

  const app = {
    enableCors,
    use,
    getHttpAdapter: () => ({ getInstance: () => ({ set }) }),
    setGlobalPrefix: jest.fn(),
    useGlobalPipes: jest.fn(),
  } as unknown as INestApplication;

  return { app, enableCors, set, use };
}

describe('CORS configuration', () => {
  it('allows only the Capacitor Android origin with the API methods and headers it uses', () => {
    expect(corsOptions).toEqual({
      origin: ['https://localhost'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  });

  it('registers the policy on every configured application', () => {
    const { app, enableCors } = stubApp();

    configureApp(app);

    expect(enableCors).toHaveBeenCalledWith(corsOptions);
  });
});

describe('proxy and security headers', () => {
  // Without this, every request carries the Docker bridge address and the
  // per-IP rate limits become one shared global limit.
  it('trusts the single Nginx hop in front of the API', () => {
    const { app, set } = stubApp();

    configureApp(app);

    expect(set).toHaveBeenCalledWith('trust proxy', 1);
  });

  // helmet is registered as middleware, before any route runs.
  it('installs the security-header middleware', () => {
    const { app, use } = stubApp();

    configureApp(app);

    expect(use).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe('OpenAPI publication', () => {
  const nodeEnv = process.env.NODE_ENV;
  const swaggerEnabled = process.env.SWAGGER_ENABLED;

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
    process.env.SWAGGER_ENABLED = swaggerEnabled;
  });

  // /api/docs is registered outside the guard pipeline, so gating it here
  // is the only place it can be gated.
  it('does not publish the document in production', () => {
    jest.mocked(setupSwagger).mockClear();
    process.env.NODE_ENV = 'production';
    delete process.env.SWAGGER_ENABLED;

    configureApp(stubApp().app);

    expect(setupSwagger).not.toHaveBeenCalled();
  });

  it('publishes it outside production', () => {
    jest.mocked(setupSwagger).mockClear();
    process.env.NODE_ENV = 'development';
    delete process.env.SWAGGER_ENABLED;

    configureApp(stubApp().app);

    expect(setupSwagger).toHaveBeenCalled();
  });

  // The override exists so a demo can turn it back on without a redeploy.
  it('honours SWAGGER_ENABLED in either direction', () => {
    jest.mocked(setupSwagger).mockClear();
    process.env.NODE_ENV = 'production';
    process.env.SWAGGER_ENABLED = 'true';

    configureApp(stubApp().app);

    expect(setupSwagger).toHaveBeenCalled();

    jest.mocked(setupSwagger).mockClear();
    process.env.NODE_ENV = 'development';
    process.env.SWAGGER_ENABLED = 'false';

    configureApp(stubApp().app);

    expect(setupSwagger).not.toHaveBeenCalled();
  });
});
