# ADR-009 - Authentication

## Status

Accepted

## Context

FR-01 and FR-02 both carry MUST priority: a user must be able to create an account, and to
log in and log out. NFR-18 turns that into a boundary rather than a screen — "all features
requiring a user account must be inaccessible to unauthenticated users", verified by a test
that reaches for private data without credentials. Every other MUST in the backlog depends on
it: a discovery has to retain its author (FR-31), a group must be invisible to non-members
(NFR-19), and a personal map must be private by default (NFR-24).

ADR-003 named "authentication and users" as the first module of the modular monolith, and
ADR-008 fixed how such a module is built — a Nest module per domain, configuration validated
at boot, the schema owned by migrations, routes under `/api`. Neither decided the mechanism,
and no other ADR covers it: nothing in `docs/` specifies a token format, a session lifetime,
a hashing algorithm, or where a client keeps its credentials.

The constraints that actually narrow the choice:

- the same bundle runs as a PWA and inside Capacitor, where the origin is `capacitor://` or
  `http://localhost` — cross-site cookies are awkward there, and `SameSite` rules make a
  cookie session fragile across the two targets;
- the database schema is already fixed (`docs/database/ldm/logical_data_model.md`): `users`
  carries `email`, `password_hash`, `user_name` and timestamps, and there is no sessions or
  refresh-token table;
- three weeks, four people, one of whom owns the backend area;
- the API is the source of truth and publishes its contract as OpenAPI, which the frontend
  team consumes rather than negotiating endpoint by endpoint.

## Decision

**Sessions are a stateless JWT access token.** The API signs an HS256 token at registration
and at login; the client sends it as `Authorization: Bearer <token>` on every other route.
There is no refresh token and no server-side session record. **Logging out is discarding the
token** — there is deliberately no logout endpoint.

**Passwords are hashed with argon2id** via `@node-rs/argon2`, at the parameters the OWASP
Password Storage Cheat Sheet recommends (19 MiB, 2 iterations, 1 degree of parallelism, 32-byte
output, per-hash random salt). Policy follows OWASP ASVS 4.0 §2.1: at least 12 characters, up
to 128, and no composition rules.

**Routes are private by default.** A single `APP_GUARD` covers every controller route, and a
route opts out with `@Public()` — currently only `POST /auth/register`, `POST /auth/login` and
the health controller. The OpenAPI UI at `/api/docs` is registered outside Nest's guard
pipeline and is unaffected.

**Identifiers are decimal strings.** `users.id` is `BIGINT`, which is lossy as a JavaScript
number above 2^53-1 and cannot be JSON-serialised as a native `bigint`. It is a string in the
entity, in every response body and in the token's `sub` claim, which RFC 7519 requires to be a
string anyway. This sets the convention for every resource that follows.

The token carries `sub`, `email`, `iat`, `exp` and `iss`, and nothing else. Anything the UI
displays — the display name in particular, which FR-03 makes editable — is read from
`GET /api/auth/me`, because every claim in a token is a copy that goes stale.

## Rationale and trade-offs

A bearer token is the shape that works unchanged in both delivery targets, needs no CORS
credential negotiation, and is trivially attachable from `fetch`, which `docs/frontend-stack.md`
already fixes as the HTTP client.

Statelessness is the real trade. It buys a guard that answers without touching the database,
and it costs revocation:

- **a stolen token stays valid until it expires.** Bounded by the 7-day default lifetime, by
  the token carrying no authority beyond its owner's own data, and by NFR-23 requiring HTTPS
  in production. `JWT_EXPIRES_IN_SECONDS` shortens it per deployment without a code change;
- **changing a password does not invalidate outstanding tokens.** Documented on the endpoint
  itself, not only here.

Seven days is chosen against the alternative of a short access token: with no refresh
endpoint, the access token lifetime *is* the session lifetime, and a mobile app that demands a
fresh login every day gets uninstalled.

`@nestjs/jwt` is used without `@nestjs/passport`. Passport buys strategy pluggability that a
single-mechanism decision does not need, at the cost of four packages and — decisively — a
`payload: any` in its verify callback and a dynamically-built strategy class, both of which
collide with the type-checked ESLint rules that gate every pull request. A ~45-line guard
using `verifyAsync<JwtPayload>()` needs no suppressions.

`@node-rs/argon2` is chosen over the `argon2` package because it publishes `linux-x64-musl`
prebuilt binaries: the API image is `node:22-alpine`, and the alternative would mean adding
`python3`, `make` and `g++` to the build stage to compile from source.

## Alternatives considered

**Access token plus refresh token with rotation.** Real revocation and short-lived access
tokens. Rejected for the MVP: it needs a `refresh_tokens` table and therefore a second
migration, rotation and reuse-detection logic, and a matching interceptor on the frontend —
against a requirement set that asks only for log in and log out. It is the natural first
upgrade.

**Server-side sessions in Postgres.** Trivially revocable, and revocation is the property the
chosen design lacks. Rejected for the database round-trip on every request and for the
cookie/CORS friction against the Capacitor origin.

**bcrypt.** Still adequate, and `bcryptjs` would avoid native binaries entirely. Rejected
because OWASP now lists argon2id first and bcrypt as the legacy option, and the musl prebuilds
removed the packaging reason to prefer it.

**Opt-in route guards.** Rejected against NFR-18: a forgotten decorator silently exposes an
endpoint, which is precisely the failure the requirement is written to prevent. Private by
default fails closed.

## Consequences

- Every controller written from here on is protected unless it says otherwise. A new module
  needs no auth wiring; it needs `@CurrentUser()` to know who is calling.
- **`GET /api/photos/:filename` now requires a token**, so `<img src="/api/photos/…">` no
  longer works — a client must fetch the bytes with the header and render the resulting object
  URL. This applies to MapLibre marker images too.
- The register endpoint answers 409 to an address that is already taken, which discloses
  whether an account exists. The only real remedy is an email-verification flow, which is out
  of MVP scope; login, by contrast, is uniform in status, message and response time.
- `JWT_SECRET` is required at boot and must be at least 32 characters. It is a deployment
  secret (NFR-22): a repository secret in CI, never a committed value.
- Deleting an account must clear the user's discoveries inside the same transaction, because
  `fk_discoveries_group_membership` is `ON DELETE RESTRICT`. Deleting a group's only owner
  currently leaves that group ownerless — `uq_group_members_one_owner_per_group` permits zero
  owners — and the groups module owns that fix.
- Authentication is the first behaviour covered by automated tests, as NFR-31 asks.

## Future evolution

- **Rate limiting** on login and password change (`@nestjs/throttler`). No NFR mandates it,
  and nothing in the current design throttles credential guessing.
- **Token revocation** without adopting refresh tokens: a `password_changed_at` column
  compared against the token's `iat` would invalidate outstanding tokens on a password change.
- **Refresh tokens**, if session length ever has to shrink without hurting usability.
- **Breached-password rejection** against Pwned Passwords (ASVS §2.1.7), deferred as a network
  call on the registration path with no requirement behind it.
- **Email change**, which needs re-authentication and a second uniqueness path.
- **Password reset**, which needs outbound email — no infrastructure for it exists today, and
  the login screen's "Forgot password?" control is currently inert.
