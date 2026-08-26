import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Claimed and verified, so a token minted elsewhere against the same secret is
 * still refused.
 */
export const JWT_ISSUER = 'sterna-api';

/**
 * One week.
 *
 * With no refresh token the access token lifetime *is* the session lifetime,
 * and a mobile PWA that forces a daily re-login gets uninstalled. The honest
 * cost is that there is no revocation: a stolen token is good until it
 * expires. It is bounded by the token carrying no authority beyond the
 * owner's own data, and by HTTPS being mandatory in production (NFR-23).
 * Deployments can shorten it with JWT_EXPIRES_IN_SECONDS (ADR-009).
 */
export const DEFAULT_JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

export const jwtModuleOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService): JwtModuleOptions => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: {
      // One service signs and the same service verifies, so there is no public
      // key to distribute and nothing to gain from an asymmetric algorithm.
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      expiresIn:
        config.get<number>('JWT_EXPIRES_IN_SECONDS') ??
        DEFAULT_JWT_EXPIRES_IN_SECONDS,
    },
    // Verification does not inherit signOptions — it has its own bag, and
    // leaving it empty is the classic JWT mistake. Pinning `algorithms` is what
    // refuses a token that declares `alg: none` or an asymmetric algorithm
    // (OWASP JWT Cheat Sheet); repeating `issuer` is what makes the claim above
    // mean anything.
    verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER },
  }),
};
