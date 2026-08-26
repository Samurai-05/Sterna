import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

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

describe('JwtAuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };

  let guard: JwtAuthGuard;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwt },
        { provide: Reflector, useValue: reflector },
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
});
