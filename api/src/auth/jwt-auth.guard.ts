import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { isJwtPayload } from './jwt.payload';
import type { JwtPayload } from './jwt.payload';

/**
 * One message for every way a token can fail.
 *
 * jsonwebtoken's own strings ("jwt malformed", "invalid signature", "jwt
 * expired") describe our verification to whoever is probing it.
 */
export const MISSING_OR_INVALID_TOKEN =
  'The bearer token is missing, invalid or has expired.';

/**
 * `Authorization: Bearer <token>`. RFC 7235 makes the scheme
 * case-insensitive, so `bearer` has to be accepted too.
 */
function bearerToken(header: string | undefined): string | undefined {
  const [scheme, token] = header?.split(' ') ?? [];

  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * NFR-18: registered globally (see AuthModule), so a route is private unless
   * it says otherwise. A controller added six weeks from now is protected by
   * default — the failure mode of the opposite wiring is a silent leak.
   *
   * No database round-trip: the token is the assertion. The cost is that a
   * deleted user's token still passes here, which AuthService turns into a 401
   * at the point of use.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = bearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(MISSING_OR_INVALID_TOKEN);
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException(MISSING_OR_INVALID_TOKEN);
    }

    // A correctly signed token can still carry claims this application never
    // minted, so the shape is checked before it is trusted.
    if (!isJwtPayload(payload)) {
      throw new UnauthorizedException(MISSING_OR_INVALID_TOKEN);
    }

    request.user = { id: payload.sub, email: payload.email };

    return true;
  }
}
