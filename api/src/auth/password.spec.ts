import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
  verifyPassword,
} from './password';

const PASSWORD = 'correct horse battery staple';

describe('hashPassword', () => {
  // OWASP Password Storage Cheat Sheet: argon2id, 19 MiB, 2 iterations, 1
  // thread. Pinned because the options object omits `algorithm` and relies on
  // the library default.
  it('produces an argon2id digest with the owasp cost parameters', async () => {
    await expect(hashPassword(PASSWORD)).resolves.toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/,
    );
  });

  it('produces a different digest each time for the same password', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    expect(first).not.toEqual(second);
  });
});

describe('verifyPassword', () => {
  it('accepts the password it hashed', async () => {
    const digest = await hashPassword(PASSWORD);

    await expect(verifyPassword(digest, PASSWORD)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const digest = await hashPassword(PASSWORD);

    await expect(verifyPassword(digest, 'not the password')).resolves.toBe(
      false,
    );
  });

  // A corrupt row must fail the login, not raise a 500 that singles the
  // account out.
  it('returns false instead of throwing on a stored value that is not a hash', async () => {
    await expect(verifyPassword('not-a-phc-string', PASSWORD)).resolves.toBe(
      false,
    );
  });
});

describe('password length bounds', () => {
  it('requires the twelve characters owasp asvs 2.1.1 asks for', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });

  it('accepts passwords well past the sixty-four of asvs 2.1.2', () => {
    expect(MAX_PASSWORD_LENGTH).toBeGreaterThanOrEqual(64);
  });
});
