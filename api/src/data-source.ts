import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './config/data-source-options';

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

/**
 * DataSource used exclusively by the TypeORM CLI (migration generate/run/revert).
 *
 * Migrations run outside the Nest application, so there is no DI container and
 * no ConfigService here — the environment is read directly. Run the CLI inside
 * the api container, where Compose already injects these values:
 *
 *   docker compose exec api npm run migration:run
 */
export default new DataSource(
  buildDataSourceOptions({
    POSTGRES_HOST: required('POSTGRES_HOST'),
    POSTGRES_PORT: Number(required('POSTGRES_PORT')),
    POSTGRES_USER: required('POSTGRES_USER'),
    POSTGRES_PASSWORD: required('POSTGRES_PASSWORD'),
    POSTGRES_DB: required('POSTGRES_DB'),
  }),
);
