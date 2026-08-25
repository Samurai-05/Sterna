import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Application-wide configuration, applied by both main.ts and the e2e tests
 * so the tests exercise the same routing and validation rules as the running
 * application instead of a slightly different one.
 */
export function configureApp(app: INestApplication): void {
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
}
