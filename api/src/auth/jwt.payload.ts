/**
 * The claims Sterna puts in an access token.
 *
 * Deliberately minimal: everything here is a copy that goes stale the moment
 * the row changes, so anything the UI displays comes from GET /api/auth/me,
 * not from the token. `userName` in particular is editable (FR-03) and is
 * therefore absent.
 */
export interface JwtPayload {
  /** users.id. RFC 7519 requires `sub` to be a string, which bigint already is. */
  sub: string;

  /** Denormalised so the guard can populate the request without a query. */
  email: string;

  /** Issued at, seconds since the epoch. Added by jsonwebtoken. */
  iat: number;

  /** Expiry, seconds since the epoch. Added by jsonwebtoken. */
  exp: number;

  /** Always JWT_ISSUER, and verified — see jwt.options.ts. */
  iss: string;
}

/**
 * A token can be correctly signed and still carry a payload this application
 * did not mint. Narrowing here is what keeps `request.user` honestly typed
 * instead of an assertion the type checker cannot back up.
 */
export function isJwtPayload(value: unknown): value is JwtPayload {
  const payload = value as Partial<JwtPayload> | null;

  return (
    typeof payload?.sub === 'string' &&
    payload.sub.length > 0 &&
    typeof payload.email === 'string'
  );
}
