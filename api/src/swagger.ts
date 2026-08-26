import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Browsable UI. Sits under the global /api prefix like every other route. */
export const SWAGGER_PATH = 'api/docs';

/** Raw OpenAPI document, for client generators and for tests. */
export const SWAGGER_JSON_PATH = `${SWAGGER_PATH}-json`;

/**
 * Builds the OpenAPI document from the controllers and DTOs themselves, so the
 * published contract cannot drift from the validation the API actually applies.
 *
 * The `@nestjs/swagger` CLI plugin (enabled in nest-cli.json) reads DTO types
 * and their class-validator decorators, which is why properties do not need an
 * explicit @ApiProperty() on every field.
 *
 * The documentation is served in every environment: this is a school project
 * whose API is meant to be demonstrated, and the endpoints are reachable anyway.
 * To restrict it later, guard the call in configureApp() on NODE_ENV.
 *
 * Note that SwaggerModule registers /api/docs through httpAdapter.get(), i.e.
 * as a raw Express route that never enters Nest's guard pipeline. The global
 * JwtAuthGuard therefore does not apply to it and it needs no @Public() —
 * there is nothing to "fix" here.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Sterna API')
    .setDescription(
      'Geolocated discoveries, personal and shared maps. ' +
        'The API is the only component that accesses PostgreSQL + PostGIS and MinIO.',
    )
    .setVersion('0.0.1')
    // Lets the docs UI's Authorize button send a token, and marks every route
    // carrying @ApiAuthenticated() as requiring one.
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
  });
}
