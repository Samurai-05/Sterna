import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';
import helmet from 'helmet';
import { isSwaggerEnabled } from './config/swagger.options';
import { setupSwagger } from './swagger';

/**
 * The packaged Android app runs at Capacitor's secure localhost origin and
 * sends bearer tokens rather than cookies. The web application stays
 * same-origin behind Nginx and does not need CORS access.
 */
export const corsOptions = {
  origin: ['https://localhost'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

/**
 * Application-wide configuration, applied by both main.ts and the e2e tests
 * so the tests exercise the same routing and validation rules as the running
 * application instead of a slightly different one.
 */
export function configureApp(app: INestApplication): void {
  // Nginx is the only hop in front of this service (ADR-007) and it forwards
  // X-Forwarded-For. Without this, every request looks like it came from the
  // Docker bridge address and the per-IP rate limits degrade into one shared
  // global limit.
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', 1);

  // nosniff, HSTS, no-referrer, frame-ancestors and the rest. CSP is left off
  // here on purpose: this service answers JSON and image bytes, the
  // browser-facing HTML is Nginx's (frontend/nginx/security-headers.conf owns
  // the real policy), and helmet's default CSP breaks the Swagger UI wherever
  // that is enabled.
  app.use(helmet({ contentSecurityPolicy: false }));

  app.enableCors(corsOptions);

  // Nginx routes /api/* to this service (ADR-007), so every route lives
  // under that prefix.
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties that have no decorator in the DTO instead of
      // silently passing them through to the business logic.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // After the pipes: the OpenAPI document describes the DTOs those pipes
  // enforce. Not in production by default — see isSwaggerEnabled().
  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }
}
