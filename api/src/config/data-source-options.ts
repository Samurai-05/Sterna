import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export interface DatabaseEnv {
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
}

/**
 * Single source of truth for the database connection.
 *
 * Used by the Nest application (through ConfigService) and by the TypeORM CLI
 * (through src/data-source.ts), so migrations can never be generated against
 * different settings than the ones the app runs with.
 */
export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
    // The schema is owned by migrations, never by entity auto-sync: a stray
    // sync against PostGIS-backed columns would be destructive.
    synchronize: false,
    migrationsRun: false,
  };
}
