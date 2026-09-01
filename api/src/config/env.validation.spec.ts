import { MAX_JWT_EXPIRES_IN_SECONDS, validate } from './env.validation';

const completeEnv = {
  POSTGRES_HOST: 'postgres',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'app_user',
  POSTGRES_PASSWORD: 'secret',
  POSTGRES_DB: 'app_db',
  MINIO_ENDPOINT: 'minio',
  MINIO_PORT: '9000',
  MINIO_USE_SSL: 'false',
  MINIO_ROOT_USER: 'minioadmin',
  MINIO_ROOT_PASSWORD: 'secret',
  MINIO_BUCKET_NAME: 'observations',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validate', () => {
  it('accepts a complete environment', () => {
    expect(() => validate(completeEnv)).not.toThrow();
  });

  it('converts numeric variables from the strings the environment provides', () => {
    expect(validate(completeEnv).POSTGRES_PORT).toBe(5432);
  });

  it('names the offending variable when one is missing', () => {
    const incomplete: Record<string, string> = { ...completeEnv };
    delete incomplete.POSTGRES_PASSWORD;

    expect(() => validate(incomplete)).toThrow(/POSTGRES_PASSWORD/);
  });

  it('rejects a port outside the valid range', () => {
    expect(() => validate({ ...completeEnv, POSTGRES_PORT: '99999' })).toThrow(
      /POSTGRES_PORT/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validate({ ...completeEnv, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('rejects an environment without MinIO credentials', () => {
    const incomplete: Record<string, string> = { ...completeEnv };
    delete incomplete.MINIO_ROOT_PASSWORD;

    expect(() => validate(incomplete)).toThrow(/MINIO_ROOT_PASSWORD/);
  });

  it('converts MINIO_USE_SSL to a real boolean', () => {
    expect(validate(completeEnv).MINIO_USE_SSL).toBe(false);
    expect(
      validate({ ...completeEnv, MINIO_USE_SSL: 'true' }).MINIO_USE_SSL,
    ).toBe(true);
  });

  // A typo must not quietly turn TLS off.
  it.each(['TRUE', 'True', '1', 'yes', ''])(
    'rejects MINIO_USE_SSL=%p instead of reading it as false',
    (value) => {
      expect(() => validate({ ...completeEnv, MINIO_USE_SSL: value })).toThrow(
        /MINIO_USE_SSL/,
      );
    },
  );

  it('names JWT_SECRET when it is missing', () => {
    const incomplete: Record<string, string> = { ...completeEnv };
    delete incomplete.JWT_SECRET;

    expect(() => validate(incomplete)).toThrow(/JWT_SECRET/);
  });

  // A short HS256 key can be brute-forced offline from one captured token, so
  // a placeholder must stop the process rather than reach production (NFR-22).
  it('rejects a JWT_SECRET shorter than thirty-two characters', () => {
    expect(() => validate({ ...completeEnv, JWT_SECRET: 'too-short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('treats JWT_EXPIRES_IN_SECONDS as optional', () => {
    expect(validate(completeEnv).JWT_EXPIRES_IN_SECONDS).toBeUndefined();
  });

  it('converts JWT_EXPIRES_IN_SECONDS from the string the environment provides', () => {
    expect(
      validate({ ...completeEnv, JWT_EXPIRES_IN_SECONDS: '604800' })
        .JWT_EXPIRES_IN_SECONDS,
    ).toBe(604800);
  });

  it('rejects a non-numeric JWT_EXPIRES_IN_SECONDS', () => {
    expect(() =>
      validate({ ...completeEnv, JWT_EXPIRES_IN_SECONDS: 'a week' }),
    ).toThrow(/JWT_EXPIRES_IN_SECONDS/);
  });

  // With no refresh token this value is the session length, so a
  // misplaced digit would mint effectively immortal tokens.
  it('rejects a JWT_EXPIRES_IN_SECONDS past the ceiling', () => {
    expect(() =>
      validate({
        ...completeEnv,
        JWT_EXPIRES_IN_SECONDS: String(MAX_JWT_EXPIRES_IN_SECONDS + 1),
      }),
    ).toThrow(/JWT_EXPIRES_IN_SECONDS/);

    expect(
      validate({
        ...completeEnv,
        JWT_EXPIRES_IN_SECONDS: String(MAX_JWT_EXPIRES_IN_SECONDS),
      }).JWT_EXPIRES_IN_SECONDS,
    ).toBe(MAX_JWT_EXPIRES_IN_SECONDS);
  });

  // Boolean('false') is true, so the transform has to read the raw
  // string. Getting this wrong would publish the document in production.
  it('reads SWAGGER_ENABLED as a boolean in both directions', () => {
    expect(validate(completeEnv).SWAGGER_ENABLED).toBeUndefined();
    expect(
      validate({ ...completeEnv, SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED,
    ).toBe(false);
    expect(
      validate({ ...completeEnv, SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED,
    ).toBe(true);
    expect(() => validate({ ...completeEnv, SWAGGER_ENABLED: 'yes' })).toThrow(
      /SWAGGER_ENABLED/,
    );
  });

  // The values config/throttling.ts reads straight off process.env.
  it('rejects a non-positive throttle limit', () => {
    expect(() =>
      validate({ ...completeEnv, AUTH_THROTTLE_LIMIT: '0' }),
    ).toThrow(/AUTH_THROTTLE_LIMIT/);
    expect(
      validate({ ...completeEnv, AUTH_THROTTLE_LIMIT: '5' })
        .AUTH_THROTTLE_LIMIT,
    ).toBe(5);
  });
});
