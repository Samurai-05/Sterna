import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MISSING_OR_INVALID_TOKEN } from '../../auth/jwt-auth.guard';

/**
 * The OpenAPI half of "this route needs a token": the security requirement
 * plus the 401 every protected route can return.
 *
 * The published document is what the frontend team builds against, so a
 * protected route that does not say it is protected is a bug.
 */
export const ApiAuthenticated = () =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({ description: MISSING_OR_INVALID_TOKEN }),
  );
