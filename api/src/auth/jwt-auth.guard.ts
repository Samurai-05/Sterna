import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { isJwtPayload } from './jwt.payload';
import type { JwtPayload } from './jwt.payload';
import { User } from './user.entity';

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
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * NFR-18: registered globally (see AuthModule), so a route is private unless
   * it says otherwise. A controller added six weeks from now is protected by
   * default — the failure mode of the opposite wiring is a silent leak.
   *
   * One indexed primary-key lookup per request, for the account's
   * password_changed_at. ADR-009 originally traded that round-trip away and
   * accepted that a password change invalidated nothing; the amendment buys
   * revocation back for the case that actually matters, and still keeps no
   * server-side session. A deleted account's token now fails here rather than
   * later at the point of use.
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

    const account = await this.users.findOne({
      where: { id: payload.sub },
      select: { id: true, passwordChangedAt: true },
    });

    if (!account || this.issuedBeforePasswordChange(payload, account)) {
      throw new UnauthorizedException(MISSING_OR_INVALID_TOKEN);
    }

    request.user = { id: payload.sub, email: payload.email };

    return true;
  }

  /**
   * `iat` has second precision, so the comparison is made in seconds on both
   * sides. Strictly-less-than rather than <=: a token minted in the same
   * second as the change is the one register/login just issued, and rejecting
   * it would sign the caller out of the device they are holding.
   */
  private issuedBeforePasswordChange(
    payload: JwtPayload,
    account: Pick<User, 'passwordChangedAt'>,
  ): boolean {
    if (!account.passwordChangedAt || payload.iat === undefined) {
      return false;
    }

    return payload.iat < Math.floor(account.passwordChangedAt.getTime() / 1000);
  }
}
