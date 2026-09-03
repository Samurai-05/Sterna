# Sterna API

The Sterna backend is a NestJS and TypeScript service that owns the business
logic and is the only component allowed to access PostgreSQL/PostGIS and MinIO.
See the [application architecture](../docs/architecture/architecture.md),
[ADR-003](../docs/architecture/decisions/ADR-003-backend-architecture.md), and
[ADR-008](../docs/architecture/decisions/ADR-008-backend-framework.md) for the
design rationale.

## Local development

The API is designed to run as part of the root Docker Compose stack:

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api npm run migration:run
```

The development container mounts `api/` and runs Nest in watch mode. The API
is available at <http://localhost:3000/api>, its health endpoint at
<http://localhost:3000/api/health>, and its interactive OpenAPI documentation
at <http://localhost:3000/api/docs>.

After changing `api/package.json`, rebuild the container and its dependency
volume:

```bash
docker compose up -d --build --renew-anon-volumes api
```

## Structure

```text
src/
├── auth/             accounts, profiles, JWT sessions and the global guard
├── common/           shared decorators such as @Public and @CurrentUser
├── config/           validated environment and data-source configuration
├── countries/        bundled country-boundary data
├── discoveries/      geolocated discoveries and sharing destinations
├── geocoding/        controlled Nominatim search proxy
├── groups/           groups, memberships, invitations and active maps
├── health/           database and object-storage health checks
├── migrations/       versioned database schema and reference data
├── photos/           validated photo upload and authenticated delivery
├── pois/             point-of-interest catalogue and exploration state
├── app-setup.ts      global prefix, validation, security and OpenAPI setup
├── app.module.ts     application composition root
├── data-source.ts    TypeORM CLI data source
└── main.ts           application bootstrap
```

Keep each domain in its own NestJS module. Register cross-cutting behaviour,
such as authentication and throttling, through the application composition
rather than duplicating it in controllers.

## Commands

Run database-dependent commands inside the API container. Linting, unit tests,
and builds can also run from `api/` on the host when its dependencies are
installed.

| Command | Purpose |
|---|---|
| `npm run lint` | Run ESLint and apply fixes |
| `npm run lint:ci` | Run ESLint without modifying files |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests against PostgreSQL and MinIO |
| `npm run build` | Compile the API to `dist/` |
| `npm run migration:generate -- src/migrations/<Name>` | Generate a migration from entity changes |
| `npm run migration:run` | Apply pending development migrations |
| `npm run migration:revert` | Revert the latest migration |
| `npm run migration:run:prod` | Apply compiled migrations during deployment |

Example:

```bash
docker compose exec api npm run test:e2e
```

## Configuration

Docker Compose injects values from the repository-root `.env`. Every API
variable is declared in `src/config/env.validation.ts`; a missing or malformed
required value prevents the service from starting.

| Variable | Meaning |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | Internal API port, normally `3000` |
| `POSTGRES_HOST`, `POSTGRES_PORT` | PostgreSQL connection endpoint |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | PostgreSQL credentials and database |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL` | MinIO connection settings |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | MinIO credentials |
| `MINIO_BUCKET_NAME` | Private photo bucket created by `minio-init` |
| `JWT_SECRET` | JWT signing key of at least 32 characters |
| `JWT_EXPIRES_IN_SECONDS` | Optional token lifetime; defaults to seven days and is capped at 30 days |
| `SWAGGER_ENABLED` | Explicitly enable or disable OpenAPI documentation |
| `THROTTLE_TTL_SECONDS`, `THROTTLE_LIMIT` | General request-rate limit |
| `AUTH_THROTTLE_TTL_SECONDS`, `AUTH_THROTTLE_LIMIT` | Authentication rate limit |
| `UPLOAD_THROTTLE_TTL_SECONDS`, `UPLOAD_THROTTLE_LIMIT` | Photo-upload rate limit |

Inside the Compose network, use the service names `postgres` and `minio`, not
`localhost`.

## Database and migrations

TypeORM migrations are the source of truth for the schema;
`synchronize` is disabled in every environment. `InitialSchema` creates the
PostGIS extension and the baseline tables, and later migrations evolve the
schema and seed versioned reference data such as countries and POIs.

When changing an entity:

1. generate a migration;
2. review its SQL, including constraints and indexes;
3. apply it against the development database;
4. run the relevant unit and end-to-end tests;
5. commit the entity and migration together.

```bash
docker compose exec api npm run migration:generate -- src/migrations/<Name>
docker compose exec api npm run migration:run
```

The deployment workflow applies compiled migrations before starting the new
API container. Spatial discovery and POI positions use WGS 84 geometry points
with SRID 4326, as described by
[ADR-004](../docs/architecture/decisions/ADR-004-database.md).

Entity metadata must continue to match named database constraints and indexes.
After an entity-only change, a scratch migration is useful for confirming that
TypeORM detects exactly the intended schema difference.

Database `BIGINT` identifiers are exposed as decimal strings. Treat them as
opaque IDs rather than converting them to JavaScript numbers.

## Authentication and authorization

Authentication uses stateless JWT access tokens as defined in
[ADR-009](../docs/architecture/decisions/ADR-009-authentication.md). Routes are
private by default through a global guard; only explicitly annotated
`@Public()` routes bypass it. Controllers retrieve the caller with
`@CurrentUser()` and services enforce ownership or group membership.

Passwords are hashed with Argon2id and never included in ordinary entity
queries or response DTOs. There is no server-side logout endpoint: logging out
means discarding the token. Changing a password records
`password_changed_at`, which invalidates tokens issued before the change.

Login returns the same response for an unknown email and an incorrect
password. Authentication and upload routes also use stricter rate limits than
ordinary API traffic. Helmet provides API security headers, while the
browser-facing Content Security Policy is configured by Nginx.

## Photos

Photos are stored in a private MinIO bucket according to
[ADR-006](../docs/architecture/decisions/ADR-006-photo-storage.md). PostgreSQL
stores ownership metadata and references to object keys; clients never access
MinIO directly.

| Route | Purpose |
|---|---|
| `POST /api/photos` | Upload a JPEG, PNG, or WebP image and return its object key, URL, and available EXIF data |
| `GET /api/photos/{uuid}.{ext}` | Authorize and stream a stored image |

Both routes require a bearer token. Since an HTML `<img>` request cannot attach
that token, clients fetch protected image bytes and render an object URL.

Keys use `photos/{uuid}.{jpg|png|webp}` and deliberately contain no user or
discovery identifier. Ownership is enforced through the `photos` table, and a
discovery does not yet exist when its photo is uploaded. A key identifies an
object but never authorizes access to it.

Uploads are limited to 10 MB. The API reads useful EXIF date and location
values, then validates and re-encodes the image with Sharp. Re-encoding applies
orientation and removes EXIF, XMP, and ICC metadata before storage.

## Groups and active maps

The active map is either the signed-in user's personal map or one group in
which they are currently a member. Personal visibility is represented by
`is_personal`; group destinations are represented by `discovery_groups`. A
single discovery may therefore remain on its author's personal map while also
appearing in one or more group maps.

The API enforces the following boundaries:

- non-members cannot retrieve or target a group;
- group administration requires the owner role;
- the owner deletes a group rather than leaving it;
- personal reads return only the signed-in user's discoveries;
- group reads return only discoveries shared with that group;
- leaving or deleting a group detaches affected sharing relationships in the
  same transaction.

Resources hidden from a caller generally return `404` rather than confirming
their existence with `403`. Detailed route contracts are available through
OpenAPI and the controllers themselves.

## API documentation

| URL | Content |
|---|---|
| `/api/docs` | Swagger UI |
| `/api/docs-json` | Raw OpenAPI 3 document |

The document is generated from controllers, DTO types, and validation
decorators. Use explicit Swagger decorators only for information that cannot
be inferred, such as descriptions, examples, and non-obvious responses.

OpenAPI is enabled outside production by default. Set `SWAGGER_ENABLED=true`
to expose it deliberately in another environment. The Swagger UI declares the
bearer scheme, so a token obtained from the login route can authorize protected
requests.

## Conventions

- Keep routes under the global `/api` prefix.
- Validate incoming data with DTOs and `class-validator`; unknown properties
  are rejected by the global validation pipe.
- Enforce authenticated data isolation in service queries, not only in the
  client.
- Add unit tests beside services and controllers, and integration behaviour to
  `test/` when it depends on the real database or object storage.
- Add new dependency checks to the health module so deployments can detect
  unavailable infrastructure.
- Keep the OpenAPI contract aligned with every new or changed route.
