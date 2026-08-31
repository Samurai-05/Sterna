import { INestApplication, ValidationPipe } from '@nestjs/common';
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
  // enforce.
  setupSwagger(app);
}
