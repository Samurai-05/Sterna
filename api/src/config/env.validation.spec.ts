import { validate } from './env.validation';

const completeEnv = {
  POSTGRES_HOST: 'postgres',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'app_user',
  POSTGRES_PASSWORD: 'secret',
  POSTGRES_DB: 'app_db',
  JWT_SECRET: 'test-secret',
  JWT_EXPIRES_IN: '1h',
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
});
