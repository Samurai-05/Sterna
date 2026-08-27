# Sterna API

The Sterna backend: a NestJS + TypeScript service exposing the application API, holding the
business logic, and acting as the only component that talks to PostgreSQL + PostGIS and
MinIO. See [ADR-003](../docs/decisions/ADR-003-backend-architecture.md) for the
architecture and [ADR-008](../docs/decisions/ADR-008-backend-framework.md) for the
framework and data access choices.

## Running it

The API is part of the root Docker Compose stack and is not meant to be started on its own:

```bash
cp .env.example .env      # from the repository root
docker compose up
```

That builds the Dockerfile's `development` target, mounts `api/` into the container and runs
`nest start --watch`, so saving a file recompiles and restarts the service. The API is
published on `http://localhost:3000` (`API_PORT` in `.env`).

Apply pending database migrations after starting the stack:

```bash
docker compose exec api npm run migration:run
```

Check that it is up:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","info":{"database":{"status":"up"},"storage":{"status":"up"}},...}
```

Interactive documentation: <http://localhost:3000/api/docs>.

**After changing `package.json`**, rebuild the image — the container's `node_modules` lives
in a volume created at build time, so a dependency installed on the host is not visible
inside it:

```bash
docker compose up -d --build --renew-anon-volumes api
```

## Layout

```
src/
├── auth/                        accounts, sessions, the global guard
├── common/                      cross-cutting decorators (@Public, @CurrentUser)
├── config/
│   ├── env.validation.ts        environment schema, validated at boot
│   └── data-source-options.ts   database settings shared by app and CLI
├── discoveries/                 geolocated discoveries (PostGIS)
├── groups/                      groups, memberships and the active map
├── health/                      GET /api/health (Terminus)
├── migrations/                  the schema — see "Database" below
├── photos/                      photo upload and download, backed by MinIO
├── pois/                        predefined points of interest (PostGIS)
├── app-setup.ts                 global prefix, validation pipe, OpenAPI
├── swagger.ts                   OpenAPI document
├── app.module.ts                composition root
├── data-source.ts               DataSource for the TypeORM CLI only
└── main.ts                      bootstrap
```

Each domain from ADR-003 (users, discoveries, groups, POIs, photos) becomes its own module
next to `health/`. Generate one with the Nest CLI rather than by hand, so it is registered
automatically:

```bash
npx nest generate module discoveries
npx nest generate controller discoveries
npx nest generate service discoveries
```

## Commands

Run these inside the container (`docker compose exec api …`) so the database environment is
already present, or from `api/` on the host for the ones that do not need a database.

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint with `--fix` |
| `npm run lint:ci` | ESLint without `--fix` — what CI runs |
| `npm test` | Unit tests (`*.spec.ts` under `src/`) |
| `npm run test:e2e` | End-to-end tests — **needs a database and MinIO**, run it in the container |
| `npm run build` | Compile to `dist/` |
| `npm run migration:generate -- src/migrations/<Name>` | Generate a migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Roll back the last migration |
| `npm run migration:run:prod` | Apply pending migrations from `dist/` — the production image has no `ts-node`, so this is what the deploy workflow runs |

## Configuration

Every variable is declared in `src/config/env.validation.ts` and validated at startup — a
missing or malformed value stops the process and names the variable. Values are injected by
Docker Compose from the repository-root `.env`; nothing is read from a `.env` inside `api/`.

| Variable | Meaning |
|---|---|
| `NODE_ENV` | `development`, `production` or `test` |
| `PORT` | Port the service listens on inside the container (3000) |
| `POSTGRES_HOST` | `postgres` on the Compose network, not `localhost` |
| `POSTGRES_PORT` | 5432 |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database credentials |
| `MINIO_ENDPOINT` | `minio` on the Compose network, not `localhost` |
| `MINIO_PORT` | 9000 |
| `MINIO_USE_SSL` | `"true"` or `"false"` (default) — the string is converted explicitly |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | MinIO credentials, shared with the `minio` service |
| `MINIO_BUCKET_NAME` | Bucket the photos live in, created by `minio-init` |
| `JWT_SECRET` | HMAC key the access tokens are signed with. At least 32 characters; generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN_SECONDS` | Optional access token lifetime, default `604800` (7 days) |

## Database

The schema is owned by migrations: TypeORM's `synchronize` is disabled everywhere, so
entity changes never reach the database on their own. Write an entity, generate a migration,
review the generated SQL, commit it.

`src/migrations/1787734644000-InitialSchema.ts` is the baseline — users, groups,
group_members, discoveries, pois, their constraints, triggers and indexes — followed by
`1787734645000-SeedPois.ts`, which inserts the predefined points of interest. Both hold
hand-written SQL, moved over from the `infra/postgres/init/` scripts that never ran anywhere
because Postgres only executes those on a brand new data volume. After them come
`1787734646000-RepairDiscoveryCategoryCheck.ts` and `1787734647000-AddGroupInviteCode.ts`,
which gives every group its invitation code.

Every entity — `auth/user.entity.ts`, `discoveries/discovery.entity.ts`, `pois/poi.entity.ts`
and the two in `groups/` — is written against that schema. An entity here *describes* an
existing table rather than specifying one, and it must match exactly: anything that does not
becomes a diff the next `migration:generate` tries to apply. Three traps that cost nothing to
avoid and are easy to miss: TypeORM compares `@Check` constraints **by name only** and drops any
it does not know about, it does the same to **indexes** (which is why `group-member.entity.ts`
re-declares all three of the table's, partial `where` clauses included), and
`@CreateDateColumn` maps to `timestamp` rather than `timestamptz` unless the type is spelled
out. After adding one, confirm the baseline is intact:

```bash
docker compose exec api npm run migration:generate -- src/migrations/Scratch
# => "No changes in database schema were found"
```

Migrations are applied on every deploy (`.github/workflows/deploy.yml`) and have to be run
by hand locally after pulling a new one:

```bash
docker compose exec api npm run migration:run
```

If your local database still carries tables applied outside migrations — the init scripts,
or a manual `psql` run — `migration:run` fails with `42P07 relation already exists`. Drop
them (`docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'DROP
TABLE IF EXISTS discoveries, group_members, groups, pois, users CASCADE; DROP FUNCTION IF
EXISTS set_updated_at();'`) and run it again. Photos live in MinIO and are unaffected.

Spatial columns use PostGIS types through TypeORM's spatial support, per
[ADR-004](../docs/decisions/ADR-004-database.md):

```ts
@Column('geometry', { spatialFeatureType: 'Point', srid: 4326 })
location: Point;
```

The `postgis` extension is created by `infra/postgres/bootstrap/001_enable_postgis.sql` when the
database volume is first initialised. `InitialSchema` also issues `CREATE EXTENSION IF NOT
EXISTS postgis` so it can bring up a database that never went through that bootstrap script.

## Authentication

Accounts and sessions, per [ADR-009](../docs/decisions/ADR-009-authentication.md). Sessions
are a **stateless JWT access token**: the API signs one at registration and at login, and the
client sends it as `Authorization: Bearer <token>`.

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register` | public | Create an account (FR-01). 201, or 409 if taken |
| `POST /api/auth/login` | public | Sign in (FR-02). 200, or 401 |
| `GET /api/auth/me` | bearer | The signed-in profile (FR-03) |
| `PATCH /api/auth/me` | bearer | Rename the account |
| `PATCH /api/auth/password` | bearer | Change the password. 204 |
| `DELETE /api/auth/me` | bearer | Delete the account. 204 |

**There is no logout endpoint, and that is deliberate** — logging out is discarding the token.
The flip side is that nothing is revocable server-side: a token stays valid until it expires
(7 days by default), and *changing a password does not invalidate tokens already issued*.

**Routes are private by default.** A single `APP_GUARD` registered in `AuthModule` covers every
controller route; `@Public()` opts one out, and only `register`, `login` and the health
controller use it (NFR-18). A new controller is therefore protected the moment it exists —
read the caller with `@CurrentUser()`:

```ts
@Get()
list(@CurrentUser() caller: AuthenticatedUser): Promise<Thing[]> {
  return this.things.forUser(caller.id);
}
```

Passwords are hashed with **argon2id** (`@node-rs/argon2`) at the OWASP-recommended cost, and
must be 12–128 characters with no composition rule (OWASP ASVS 4.0 §2.1). `password_hash` is
`select: false` on the entity *and* never crosses the service boundary — responses are built
by an explicit entity-to-DTO mapping, so there is no field for it to leak through.

**Identifiers are decimal strings, not numbers.** `users.id` is `BIGINT`, which is lossy as a
JavaScript number above 2^53-1. Treat `id` as opaque; this is the convention for every
resource.

Two things a wrong assumption would break, both worth reading before writing a client:

- a **wrong `currentPassword`** on the two re-authentication routes is answered **400, not
  401** — the token was fine, a body value was not. That keeps 401 meaning exactly one thing:
  the session is over, send the user to the login screen;
- **login is uniform.** An unknown address and a wrong password get the same status, the same
  message and the same response time, so the endpoint cannot be used to discover whether an
  account exists.

## Photos

Photos are stored in MinIO ([ADR-006](../docs/decisions/ADR-006-photo-storage.md)); Postgres
holds only the object key, in `DISCOVERIES.image_object_key`. Clients never talk to MinIO —
both directions go through the API.

| Route | Purpose |
|---|---|
| `POST /api/photos` | `multipart/form-data`, field `file`. Returns `{ objectKey, url, exif }` |
| `GET /api/photos/{uuid}.{ext}` | Streams the object back out |

**Both routes require a bearer token** (NFR-18, NFR-24). That has a consequence worth
spelling out for the frontend: an `<img src="/api/photos/…">` cannot attach an
`Authorization` header, so a client has to `fetch()` the bytes and render
`URL.createObjectURL(blob)` instead — MapLibre marker images included. Authorization today
stops at "is the caller signed in"; checking that *this* caller may see the discovery a photo
belongs to needs the discoveries table and is marked `TODO(discoveries)` in the controller.

A photo is uploaded *before* the discovery that references it exists, so upload is a
standalone resource: it returns a key, and the client sends that key with the rest of the
discovery. Keys look like `photos/{uuid}.{jpg|png|webp}` — see
[`infra/minio/README.md`](../infra/minio/README.md) for why they carry no user or discovery
segment.

On upload the service reads the EXIF GPS tags so the client can pre-fill the location
(FR-06), then re-encodes the image through `sharp`. Re-encoding does three jobs at once: it
strips every metadata block from the stored object (NFR-27), bakes the orientation flag into
the pixels, and validates the bytes for real — the declared MIME type is client-supplied,
so it cannot be trusted on its own (NFR-21). A photo with no usable GPS tag returns
`exif: null` and still uploads (FR-33).

## Groups and the active map

Groups (FR-25 … FR-33) live in `src/groups/`. The `groups` and `group_members` tables come from
the baseline schema; `AddGroupInviteCode1787734647000` added the one column the feature needed.

| Route | Purpose |
|---|---|
| `POST /api/groups` | Create a group. The caller becomes its owner. 201 |
| `GET /api/groups` | The caller's groups, with their role, the active flag and member/discovery counts |
| `GET /api/groups/{id}` | One group: members (FR-32) and the invitation code |
| `PATCH /api/groups/{id}` | Rename or re-describe. **Owner only** |
| `DELETE /api/groups/{id}` | Delete. **Owner only.** 204 |
| `POST /api/groups/join` | Join with `{ inviteCode }`. 200 |
| `DELETE /api/groups/{id}/members/me` | Leave (FR-33). 204 |
| `GET /api/groups/{id}/discoveries` | The group's shared map (FR-29), each discovery carrying its author (FR-31) |
| `GET /api/active-map` | The map new discoveries go to (FR-27) |
| `GET /api/pois` | The 195 predefined POIs with a discovery status calculated for the caller's active map |
| `PUT /api/active-map` | Change it with `{ groupId }`, or `{ groupId: null }` for the personal map (FR-28) |

**A personal map is not a group.** It is the absence of one: a discovery with `group_id = NULL`
is personal, and a user with no active membership has their personal map active. That is why
`/api/active-map` is its own resource rather than `/api/groups/active` — `null` is one of its
legitimate values.

**Invitations are one permanent code per group**, eight characters from an alphabet with no
lookalikes (`ABCDEFGHJKMNPQRSTVWXYZ23456789` — no `I`, `L`, `O`, `U`, `0` or `1`). There is no
invitation table, no expiry and no per-recipient token: the owner copies the code off the group
screen and the recipient types it in. The lookup ignores case, spaces and dashes, so `ab3k-9qz2`
and `AB3K9QZ2` are the same invitation, and joining twice is a no-op rather than a 409.

Three rules that a wrong assumption would break:

- **A non-member is answered 404, not 403** — on every group route, including
  `PUT /api/active-map` and a discovery aimed at someone else's group. A group must be invisible
  to people outside it (NFR-19), and 403 would still confirm that it exists. Once membership *is*
  established, the owner-only routes answer **403**: the caller can already see the group, so
  there is nothing left to hide.
- **The owner cannot leave a group** (409) — they delete it instead.
  `uq_group_members_one_owner_per_group` permits *zero* owners, so nothing in the schema stops a
  group from being abandoned with no one able to rename or delete it. This is where that is
  prevented.
- **A group discovery is on two maps at once**: the group's, and its author's personal map.
  `GET /api/discoveries` filters on `user_id` alone and does not exclude group discoveries.
  Nobody else's discoveries ever appear there, group-mates included (NFR-24), and no personal
  discovery is ever pulled onto a group map (NFR-25).

**Leaving or deleting has to detach the discoveries first.** `fk_discoveries_group_membership` is
`ON DELETE RESTRICT` and Postgres checks it immediately, so a membership cannot be deleted while
that member still has discoveries in the group. Both paths run
`UPDATE discoveries SET group_id = NULL …` inside the same transaction before touching
`group_members` — which is also why the discoveries survive: they go back to the personal maps of
whoever took them, never to the bin.

## API documentation

| URL | Content |
|---|---|
| `/api/docs` | Swagger UI |
| `/api/docs-json` | Raw OpenAPI 3 document, for client generators |

The document is generated from the controllers and DTOs themselves, so it cannot drift from
the validation the API actually enforces. The `@nestjs/swagger` CLI plugin is enabled in
`nest-cli.json`, which means it reads TypeScript types and the existing `class-validator`
decorators: **DTO properties do not need an `@ApiProperty()` on every field**. Decorators
are only worth adding for what cannot be inferred — summaries, descriptions, response
examples and non-obvious status codes, as in `health/health.controller.ts`.

The documentation is served in **every environment**, production included. This is a school
project whose API is meant to be demonstrated, and the endpoints are reachable regardless of
whether they are documented. To restrict it, guard the `setupSwagger(app)` call in
`app-setup.ts` on `NODE_ENV`.

The document declares a `bearer` security scheme, so the UI's **Authorize** button takes a
token from `POST /api/auth/login` and sends it on every protected route. Note that Swagger's
own routes are registered through `httpAdapter.get()`, outside Nest's guard pipeline — the
global `JwtAuthGuard` does not apply to them and they need no `@Public()`.

## Conventions

- **Routes** live under `/api` (`app-setup.ts`), matching the Nginx routing in ADR-007.
- **Incoming data** is validated by DTOs with `class-validator`. The global pipe runs with
  `whitelist` and `forbidNonWhitelisted`, so a request carrying an undeclared property is
  rejected rather than silently trimmed.
- **Health checks** belong in `health/`: add an indicator to the array in
  `health.controller.ts` when a new dependency (MinIO, for instance) is introduced.
