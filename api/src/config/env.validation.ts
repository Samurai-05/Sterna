import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Every environment variable the API depends on.
 *
 * Validated once at boot (see ConfigModule.forRoot in AppModule) so a
 * misconfigured environment fails immediately and explicitly, instead of
 * surfacing later as a connection error on the first request that needs it.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV?: Environment;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  POSTGRES_PORT: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MINIO_PORT: number;

  // enableImplicitConversion has already run by the time this transform fires,
  // and it turns the string "false" into `true` (Boolean("false") === true).
  // `obj` is the untouched environment, so read the raw string from there.
  //
  // Anything that is neither "true" nor "false" is passed through unchanged, so
  // @IsBoolean() rejects it and names the variable: a typo must not quietly
  // turn TLS off.
  @IsOptional()
  @Transform(({ obj }) => {
    const raw = (obj as Record<string, unknown>).MINIO_USE_SSL;

    if (raw === 'true') {
      return true;
    }

    return raw === 'false' ? false : raw;
  })
  @IsBoolean()
  MINIO_USE_SSL?: boolean;

  // The MinIO root credentials for now. A dedicated service account scoped to
  // the photo bucket is a hardening item, not an MVP one.
  @IsString()
  @IsNotEmpty()
  MINIO_ROOT_USER: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ROOT_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET_NAME: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // enableImplicitConversion turns the strings the environment always hands us
  // ("5432") into the numbers the @IsInt() rules expect.
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated;
}
