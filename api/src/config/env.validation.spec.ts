import { validate } from './env.validation';

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
});
