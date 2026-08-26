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
  MinLength,
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

  // HMAC key the access tokens are signed with. 32 characters is the floor
  // because a shorter HS256 key can be brute-forced offline from a single
  // captured token; rejecting it here is what stops a placeholder secret from
  // reaching production (NFR-22).
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  // Seconds rather than a duration string ("7d"): @types/jsonwebtoken types
  // SignOptions.expiresIn as `StringValue | number`, so a plain string read
  // from the environment does not type-check. It is also the unit RFC 6749
  // uses for the expiresIn the API hands back to clients.
  @IsOptional()
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS?: number;
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
