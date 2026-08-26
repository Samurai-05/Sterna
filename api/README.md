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
# {"status":"ok","info":{"database":{"status":"up"}},...}
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
├── config/
│   ├── env.validation.ts        environment schema, validated at boot
│   └── data-source-options.ts   database settings shared by app and CLI
├── health/                      GET /api/health (Terminus)
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
| `npm run test:e2e` | End-to-end tests — **needs a database**, run it in the container |
| `npm run build` | Compile to `dist/` |
| `npm run migration:generate -- src/migrations/<Name>` | Generate a migration from entity changes |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Roll back the last migration |

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

## Database

The schema is owned by migrations: TypeORM's `synchronize` is disabled everywhere, so
entity changes never reach the database on their own. Write an entity, generate a migration,
review the generated SQL, commit it.

Spatial columns use PostGIS types through TypeORM's spatial support, per
[ADR-004](../docs/decisions/ADR-004-database.md):

```ts
@Column('geometry', { spatialFeatureType: 'Point', srid: 4326 })
location: Point;
```

The `postgis` extension is created by `infra/postgres/bootstrap/001_enable_postgis.sql` when the
database volume is first initialised.

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

When authentication lands, add `.addBearerAuth()` to the `DocumentBuilder` chain in
`swagger.ts` so the UI can send a token.

## Conventions

- **Routes** live under `/api` (`app-setup.ts`), matching the Nginx routing in ADR-007.
- **Incoming data** is validated by DTOs with `class-validator`. The global pipe runs with
  `whitelist` and `forbidNonWhitelisted`, so a request carrying an undeclared property is
  rejected rather than silently trimmed.
- **Health checks** belong in `health/`: add an indicator to the array in
  `health.controller.ts` when a new dependency (MinIO, for instance) is introduced.
