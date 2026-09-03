# ADR-004 - Database

## Status

Accepted

## Context

Sterna requires persistent storage for structured application data such as:

- users;
- discoveries;
- groups and memberships;
- POIs;
- data used to derive exploration progress;
- photo metadata.

The data model is primarily relational, with clear relationships between users, discoveries, groups, and associated metadata.

Sterna also handles geographical data intrinsically: discoveries have positions, country detection depends on geographical containment, and POI discovery depends on proximity. The database therefore needs to support spatial data and operations in addition to its relational responsibilities.

## Decision

Sterna will use **PostgreSQL with PostGIS** as its relational and spatial database.

PostGIS is an extension of PostgreSQL, not a separate database. It provides spatial types, functions, and indexes for geographical data stored in PostgreSQL.

PostgreSQL is responsible for storing structured application data and enforcing relational constraints. PostGIS is responsible for the spatial representation and operations required by Sterna.

Discovery and POI positions are stored as `geometry(Point, 4326)` columns.
Country boundaries are stored as `geometry(MultiPolygon, 4326)`. Queries that
need distances in metres cast these geometries to `geography`, while GiST
indexes support containment and proximity lookups.

The Node.js backend remains the only access point for the data. It validates inputs, applies business rules, and orchestrates queries executed by PostGIS for operations such as country containment, POI proximity, and future region or grid queries.

### Rationale and trade-offs

PostgreSQL provides a mature and reliable relational model that fits Sterna's application data well.

It supports:

- relational integrity;
- transactions;
- indexing;
- constraints;
- structured queries;
- straightforward integration with Node.js.

PostGIS is appropriate because geographical data is central to Sterna rather than an incidental attribute. Spatial types avoid treating every position as an unrelated pair of numeric values, while spatial functions and indexes provide capabilities suited to country detection, POI proximity, and future geographical operations.

The trade-off is the additional extension configuration and the need to design, import, and maintain suitable geographical datasets. The backend must also keep spatial queries aligned with the application's business rules.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| PostgreSQL without PostGIS | Simpler database setup and numeric coordinate storage | Rejects the spatial capabilities required by Sterna and moves geographical operations outside the database |
| MySQL / MariaDB | Mature relational databases with broad ecosystem support | Less aligned with the team's selected stack and no clear advantage for the project |
| NoSQL database | Flexible schema and simple horizontal scaling | Less suitable for strongly relational data such as users, groups, memberships and discoveries |

## Consequences

### Positive

- mature and widely supported relational database;
- simple deployment and local development;
- strong support for relational constraints and transactions;
- spatial types, functions, and indexes through the PostgreSQL extension;
- straightforward integration with the Node.js backend.

### Negative

- the PostGIS extension and its geographical datasets must be configured and maintained;
- spatial queries and indexes require appropriate design and monitoring;
- the bundled country-boundary dataset must be versioned and kept consistent
  with the country veil generated for the frontend.

## Implementation status

The decision is fully implemented. TypeORM migrations own the schema and seed
the bundled `api/src/countries/countries.geo.json` dataset. Discoveries store a
derived ISO alpha-3 `country_code`; the database uses GiST indexes for country
containment, country-distance fallbacks, discovery locations, and POI
locations. Progress is derived from discoveries and POI proximity rather than
being maintained in a separate progression table.

## Future evolution

This decision should be revisited if Sterna's data volume or geographical
model grows beyond the current scope, for example through:

- large-scale distance queries;
- intersections between geographical objects;
- complex region queries;
- server-side geographical aggregation.
