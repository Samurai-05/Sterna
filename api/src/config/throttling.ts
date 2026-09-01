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
 *
 * They are sized for a *shared* address, not a single user. The application
 * is reached over the campus network, so an entire class arrives from one
 * NAT egress IP and a per-IP limit is really a per-room limit. The numbers
 * below are therefore generous in absolute terms while still being orders of
 * magnitude below what credential stuffing or a flood needs — the point is to
 * make those uneconomic, not to police ordinary use.
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
 * The ceiling every route sits under. It is a runaway client and a crude
 * flood this catches, not credential stuffing.
 *
 * A single map-plus-collection load is already tens of requests — one per
 * photo, lazily as cards enter the viewport — so several people sharing an
 * address reach the hundreds in a minute without doing anything unusual.
 */
export const GLOBAL_THROTTLE = limitFrom(
  'THROTTLE_TTL_SECONDS',
  'THROTTLE_LIMIT',
  60,
  1200,
);

/**
 * Register and login: the credential-stuffing surface, and the one that runs
 * an argon2id verify at 19 MiB per call.
 *
 * 40 per quarter-hour is roughly a demo room's worth of sign-ins and typos,
 * and still four orders of magnitude short of a useful password-spraying run.
 */
export const AUTH_THROTTLE = limitFrom(
  'AUTH_THROTTLE_TTL_SECONDS',
  'AUTH_THROTTLE_LIMIT',
  900,
  40,
);

/** Photo upload — 10 MB buffered and decoded through sharp per request. */
export const UPLOAD_THROTTLE = limitFrom(
  'UPLOAD_THROTTLE_TTL_SECONDS',
  'UPLOAD_THROTTLE_LIMIT',
  600,
  120,
);

export function throttlerOptions(): ThrottlerModuleOptions {
  // One unnamed-by-convention throttler ('default'), which the strict routes
  // then override with @Throttle({ default: ... }). Declaring a second named
  // throttler instead would apply it to every route in the application, not
  // only to the ones that want it.
  return { throttlers: [{ name: 'default', ...GLOBAL_THROTTLE }] };
}
