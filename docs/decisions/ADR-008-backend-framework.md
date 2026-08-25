# ADR-008 - Backend Framework and Data Access Layer

## Status

Accepted

## Context

ADR-003 established that Sterna's backend is a single Node.js API service organised as a
modular monolith, and explicitly left the choice of web framework open. ADR-004 established
PostgreSQL + PostGIS as the database, with spatial operations executed by PostGIS and
orchestrated by the API.

Two decisions therefore remain: which Node.js framework structures the API service, and how
that service accesses PostgreSQL and its spatial types.

The constraints are those of the project as a whole:

- a small team working over three weeks, with one member owning the backend area;
- TypeScript already chosen for the frontend (ADR-001), making a single language across the
  codebase desirable;
- geographical data is central rather than incidental, so spatial columns and spatial
  queries must be first-class rather than worked around;
- the modular boundaries described in ADR-003 (authentication and users, discoveries,
  groups, POIs, geographical workflows, photo management) must be expressible in the code
  structure itself, not only by convention;
- the service must run identically in Docker Compose during development and on the school
  VM (ADR-007).

## Decision

The API service will be built with **NestJS** (v11, TypeScript), using **TypeORM** as its
data access layer for PostgreSQL + PostGIS.

The following conventions accompany this decision:

- **Module per domain.** Each responsibility listed in ADR-003 becomes a Nest module, which
  is what makes the modular monolith a structural property rather than a naming convention.
- **Configuration is validated at boot.** All environment variables are declared and
  validated when the application starts; a misconfigured environment fails immediately and
  names the offending variable, instead of failing later on the first request that needs it.
- **The schema is owned by migrations.** TypeORM's `synchronize` option is disabled in every
  environment. Schema changes go through migration files kept under version control.
- **All routes live under the `/api` prefix**, matching the Nginx routing described in
  ADR-007.
- **The service exposes a health endpoint** (`GET /api/health`) that reports the
  reachability of its dependencies, consumed by the Docker Compose healthcheck and by the
  deployment pipeline.

The position of a discovery is represented by a PostGIS spatial column, declared through
TypeORM's spatial column support (`spatialFeatureType` and `srid`), consistent with ADR-004.

### Rationale and trade-offs

NestJS is chosen because its module system maps directly onto the architecture ADR-003
already committed to. The alternatives place no constraint on structure, which means the
modular boundaries would depend entirely on team discipline — a weak guarantee for a
codebase written quickly by four people. Dependency injection additionally makes the
business logic testable without a running database, and the framework ships first-party
modules for the concerns this project needs (configuration, validation, database
integration, health checks).

TypeORM is chosen primarily because of PostGIS. It supports spatial column types natively,
so a discovery's position is a typed property of an entity rather than an opaque value
requiring raw SQL on every read and write. Since country containment and POI proximity are
core features rather than edge cases, the difference is structural, not cosmetic.

The trade-offs are real. NestJS imposes more structure and vocabulary than a minimal
framework, which costs time before the first endpoint exists and adds concepts a
contributor must learn. TypeORM offers weaker type inference than more recent alternatives,
and its 1.x line is recent enough that documentation and examples found online frequently
describe the previous 0.3 API.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| Express | Minimal, ubiquitous, no learning curve | Provides no structure; the modular boundaries of ADR-003 would rest entirely on convention |
| Fastify | Faster than Express, good TypeScript support | Same structural gap as Express; performance is not a constraint at this scale |
| NestJS + Prisma | Excellent developer experience and type safety | PostGIS types are unsupported; every spatial read, write and query falls back to raw SQL — precisely the operations at the core of Sterna |
| NestJS + Drizzle/Kysely | Lightweight, SQL-first, fully typed | No official NestJS integration; migration conventions and provider wiring must be built by hand |

## Consequences

### Positive

- the architecture of ADR-003 is enforced by the framework rather than by convention;
- one language and one type system across frontend and backend;
- PostGIS spatial types are usable directly from entities;
- configuration errors surface at startup with an explicit message;
- dependency injection makes modules testable in isolation;
- first-party modules cover configuration, validation, database access and health checks.

### Negative

- NestJS has a steeper initial learning curve than a minimal framework;
- decorator-heavy code requires familiarity with the framework's conventions;
- TypeORM's type inference is weaker than that of more recent alternatives;
- online material commonly targets TypeORM 0.3 rather than the 1.x line in use here.

## Future evolution

The module boundaries make it possible to extract a responsibility into a separate service
later, as anticipated by ADR-003. Should the data access layer become a limitation,
repositories are the natural seam at which TypeORM could be replaced without rewriting the
business logic.
