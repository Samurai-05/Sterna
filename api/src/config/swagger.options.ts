/**
 * Whether to publish the OpenAPI document.
 *
 * SwaggerModule.setup() registers /api/docs through httpAdapter.get(), i.e. as
 * a raw Express route that never enters Nest's guard pipeline — @Public() does
 * not apply to it and neither does the global JwtAuthGuard. In production that
 * handed an anonymous caller a machine-readable map of every endpoint and
 * every constraint, which is why the gate lives here rather than on a guard.
 *
 * Read from the raw environment because configureApp() has no ConfigService,
 * and giving it one ripples into main.ts and the e2e harness. env.validation
 * still validates the value at boot.
 *
 * Unset means "not in production": the e2e suite and local development run
 * with NODE_ENV=development and keep the document. SWAGGER_ENABLED=true turns
 * it back on for a demo without a code change.
 */
export function isSwaggerEnabled(): boolean {
  const override = process.env.SWAGGER_ENABLED;

  if (override === 'true') return true;
  if (override === 'false') return false;

  return process.env.NODE_ENV !== 'production';
}
