# ADR-009 - Authentication

## Status

Accepted, amended 2026-09-01 — see "Amendment: password change revokes tokens" below.
Implementation notes updated 2026-09-03.

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

- the same bundle runs as a PWA and inside Capacitor, where the packaged Android application
  uses the secure `https://localhost` origin — cross-site cookies are awkward there, and
  `SameSite` rules make a cookie session fragile across the two targets;
- the database schema is already fixed (`docs/architecture/database/ldm/logical_data_model.md`): `users`
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
credential negotiation, and is trivially attachable through the native Fetch API used by
the shared frontend.

The original stateless design let the guard answer without touching the database but offered
no early revocation. The password-change amendment below deliberately gives up the database-free
guard check while retaining JWTs and avoiding a server-side session table:

- **a stolen token stays valid until it expires, the password changes, or the account is
  deleted.** It carries the same API authority as the account, including access to group data
  allowed by current memberships. The 7-day default lifetime limits the window, HTTPS protects
  the token in transit, and `JWT_EXPIRES_IN_SECONDS` can shorten it per deployment;
- **changing a password invalidates outstanding tokens.** The guard compares the token's
  issuance time with the user's `password_changed_at`, as detailed in the amendment below.

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

## Amendment: password change revokes tokens

*Added 2026-09-01, after a security review of the deployed application.*

The original decision accepted that changing a password invalidated nothing already issued.
In practice that makes the one action a user takes when they believe they have been
compromised a no-op for up to seven days — the stolen token keeps working, and the product
offers no other way to end a session.

**`users.password_changed_at` is added** (migration `1787734654000-AddPasswordChangedAt`),
`AuthService.changePassword()` sets it, and `JwtAuthGuard` rejects any token whose `iat`
predates it. No new claim is needed: `iat` is already minted by jsonwebtoken. The column is
nullable with no default, so deploying it signs nobody out.

What this costs, explicitly: **the guard now makes one indexed primary-key lookup per
request**, which the "Rationale and trade-offs" section above listed as something the design
bought. That claim is no longer true. What is still true is that there is no server-side
session and no revocation list — the comparison is against a column on the user's own row,
not against stored session state, and it is the same row a request touches moments later
anyway. `users.updated_at` could not be reused: it also moves on a display-name edit, which
would sign every device out on a rename.

Two consequences follow:

- **the caller's own token dies too.** `PATCH /api/auth/password` returns 204 and mints no
  replacement, so a client must discard its token and send the user back to the login
  screen. The frontend does this in `EditProfilePage`.
- **a deleted account's token now fails at the guard** rather than later at the point of use,
  because the same lookup finds no row. This is an improvement, but it changes when the 401
  appears.

The alternative considered was leaving the ADR alone and shortening the default lifetime
instead. Rejected: it narrows the window without giving the user any way to close it, and a
mobile app that demands a fresh login every day is the thing the seven days were chosen to
avoid.

## Amendment note: register still discloses account existence

*Added 2026-09-01, from the same review.*

The consequence above — "the register endpoint answers 409 to an address that is already
taken, which discloses whether an account exists" — is unchanged, and the only real remedy
is still an email-verification flow that stays out of MVP scope. Two things were done short
of that: the 409 no longer echoes the submitted address back into its message, and
`POST /api/auth/register` is rate-limited alongside `login`, so enumerating a list of
addresses is slow rather than free.

## Implementation status

- Deleting an account clears the user's discoveries inside the same transaction, because
  `fk_discoveries_group_membership` is `ON DELETE RESTRICT`. For each group the user owns,
  ownership is transferred to the longest-tenured remaining member; a group with no other
  member is dissolved. The user's owned MinIO objects are purged after the database
  transaction succeeds.
- Authentication is the first behaviour covered by automated tests, as NFR-31 asks.

## Future evolution

- **Refresh tokens**, if session length ever has to shrink without hurting usability.
- **Breached-password rejection** against Pwned Passwords (ASVS §2.1.7), deferred as a network
  call on the registration path with no requirement behind it.
- **Email change**, which needs re-authentication and a second uniqueness path.
- **Password reset**, which needs outbound email infrastructure that does not exist today.
