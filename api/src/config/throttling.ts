import { ThrottlerModuleOptions, seconds } from '@nestjs/throttler';

/**
 * Rate limits.
 *
 * `POST /api/auth/login` is @Public() and runs an argon2id verify at 19 MiB /
 * t=2 per request, which makes it two things at once: an unlimited
 * credential-stuffing surface, and a memory-amplification DoS an anonymous
 * caller can aim at the process. `POST /api/photos` buffers 10 MB and decodes
 * it through sharp twice. Neither had any ceiling.
 *
 * Values are read from the raw environment rather than through ConfigService
 * because @Throttle() is a decorator, evaluated at import time — the same
 * reason src/data-source.ts reads process.env directly. env.validation.ts
 * still validates them at boot, so a malformed value fails loudly there.
 *
 * The defaults are the production ones. docker-compose.override.yml relaxes
 * them for development, where the e2e suite registers and logs in dozens of
 * times from a single source.
 */
function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function limitFrom(
  ttlVariable: string,
  limitVariable: string,
  ttlFallbackSeconds: number,
  limitFallback: number,
): { ttl: number; limit: number } {
  return {
    ttl: seconds(positiveInt(process.env[ttlVariable], ttlFallbackSeconds)),
    limit: positiveInt(process.env[limitVariable], limitFallback),
  };
}

/**
 * The ceiling every route sits under. Generous on purpose: it is a runaway
 * client and a crude flood that this catches, not credential stuffing.
 */
export const GLOBAL_THROTTLE = limitFrom(
  'THROTTLE_TTL_SECONDS',
  'THROTTLE_LIMIT',
  60,
  240,
);

/** Register and login. Strict: this is the credential-stuffing surface. */
export const AUTH_THROTTLE = limitFrom(
  'AUTH_THROTTLE_TTL_SECONDS',
  'AUTH_THROTTLE_LIMIT',
  900,
  10,
);

/** Photo upload — 10 MB buffered and decoded twice per request. */
export const UPLOAD_THROTTLE = limitFrom(
  'UPLOAD_THROTTLE_TTL_SECONDS',
  'UPLOAD_THROTTLE_LIMIT',
  600,
  30,
);

export function throttlerOptions(): ThrottlerModuleOptions {
  // One unnamed-by-convention throttler ('default'), which the strict routes
  // then override with @Throttle({ default: ... }). Declaring a second named
  // throttler instead would apply it to every route in the application, not
  // only to the ones that want it.
  return { throttlers: [{ name: 'default', ...GLOBAL_THROTTLE }] };
}
