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
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Sterna API')
    .setDescription(
      'Geolocated discoveries, personal and shared maps. ' +
        'The API is the only component that accesses PostgreSQL + PostGIS and MinIO.',
    )
    .setVersion('0.0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
  });
}
