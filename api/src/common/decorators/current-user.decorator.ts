import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../authenticated-user';

/**
 * The caller, as JwtAuthGuard resolved them from the bearer token.
 *
 * Throws rather than returning undefined when nothing is there: the only way
 * to reach a handler with no `request.user` is to combine this with @Public(),
 * and that mistake should surface loudly at the first request rather than as
 * `undefined` flowing into a query.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException(
        'This endpoint requires an authenticated caller.',
      );
    }

    return request.user;
  },
);
