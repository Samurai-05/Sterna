import { scryptSync } from 'node:crypto';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with explicit scrypt parameters', () => {
    const hash = service.hash('password-123');

    expect(hash).toMatch(
      /^scrypt:N=16384:r=8:p=1:keylen=64:[0-9a-f]{32}:[0-9a-f]{128}$/,
    );
  });

  it('verifies a matching password', () => {
    const hash = service.hash('password-123');

    expect(service.verify('password-123', hash)).toBe(true);
  });

  it('rejects a non-matching password', () => {
    const hash = service.hash('password-123');

    expect(service.verify('wrong-password', hash)).toBe(false);
  });

  it('keeps compatibility with the previous scrypt hash format', () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const hash = scryptSync('password-123', salt, 64, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    }).toString('hex');

    expect(service.verify('password-123', `scrypt:${salt}:${hash}`)).toBe(
      true,
    );
  });
});
