import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './user.entity';

/** A request carrying whatever Authorization header the case under test needs. */
function contextFor(authorization?: string): {
  context: ExecutionContext;
  request: Request;
} {
  const request = { headers: { authorization } } as Request;

  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

/** Seconds since the epoch, the unit `iat` is expressed in. */
const NOW = Math.floor(Date.now() / 1000);

describe('JwtAuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  const users = { findOne: jest.fn() };

  let guard: JwtAuthGuard;

  beforeEach(async () => {
    jest.resetAllMocks();
    // The account exists and has never changed its password, unless a case
    // below says otherwise.
    users.findOne.mockResolvedValue({ id: '42', passwordChangedAt: null });

    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwt },
        { provide: Reflector, useValue: reflector },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  // NFR-18 boundary: @Public() is the only way past the guard, and it must not
  // depend on the caller sending anything at all.
  it('lets a public route through without looking at the header', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = contextFor(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('populates the request from the token subject and email', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'ada@sterna.test' });
    const { context, request } = contextFor('Bearer a.token.value');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: '42', email: 'ada@sterna.test' });
  });

  it('accepts a lower-case bearer scheme', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({ sub: '42', email: 'ada@sterna.test' });
    const { context } = contextFor('bearer a.token.value');

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a request with no authorization header', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { context } = contextFor(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      /missing, invalid or has expired/,
    );
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects a header whose scheme is not bearer', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { context } = contextFor('Basic dXNlcjpwYXNz');

    await expect(guard.canActivate(context)).rejects.toThrow(
      /missing, invalid or has expired/,
    );
  });

  // The library's own wording ("invalid signature", "jwt expired") describes
  // our verification to whoever is probing it.
  it('rejects a token verifyAsync throws on without repeating the library message', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const { context } = contextFor('Bearer a.token.value');

    await expect(guard.canActivate(context)).rejects.toThrow(
      /missing, invalid or has expired/,
    );
    await expect(guard.canActivate(context)).rejects.not.toThrow(
      /invalid signature/,
    );
  });

  it('rejects a correctly signed token whose payload has no subject', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwt.verifyAsync.mockResolvedValue({ email: 'ada@sterna.test' });
    const { context, request } = contextFor('Bearer a.token.value');

    await expect(guard.canActivate(context)).rejects.toThrow(
      /missing, invalid or has expired/,
    );
    expect(request.user).toBeUndefined();
  });

  // ADR-009 originally accepted that a password change invalidated
  // nothing, which made "I think I was compromised" a no-op for up to a week.
  describe('password change', () => {
    function tokenIssuedAt(iat: number) {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwt.verifyAsync.mockResolvedValue({
        sub: '42',
        email: 'ada@sterna.test',
        iat,
      });

      return contextFor('Bearer a.token.value');
    }

    it('rejects a token issued before the password changed', async () => {
      users.findOne.mockResolvedValue({
        id: '42',
        passwordChangedAt: new Date(NOW * 1000),
      });
      const { context, request } = tokenIssuedAt(NOW - 60);

      await expect(guard.canActivate(context)).rejects.toThrow(
        /missing, invalid or has expired/,
      );
      expect(request.user).toBeUndefined();
    });

    it('accepts a token issued after the password changed', async () => {
      users.findOne.mockResolvedValue({
        id: '42',
        passwordChangedAt: new Date((NOW - 60) * 1000),
      });
      const { context } = tokenIssuedAt(NOW);

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    // Nullable with no default, so deploying the column must not sign
    // everyone out.
    it('accepts a token when the password has never been changed', async () => {
      const { context } = tokenIssuedAt(NOW - 60 * 60 * 24 * 7);

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('rejects a token whose account no longer exists', async () => {
      users.findOne.mockResolvedValue(null);
      const { context } = tokenIssuedAt(NOW);

      await expect(guard.canActivate(context)).rejects.toThrow(
        /missing, invalid or has expired/,
      );
    });
  });
});
