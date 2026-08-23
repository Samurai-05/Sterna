# ADR-004 - Database

## Status

Accepted

## Context

Sterna requires persistent storage for structured application data such as:

- users;
- discoveries;
- groups and memberships;
- POIs;
- progression data;
- photo metadata.

Geographical data is central to the application. Discoveries contain coordinates, countries are represented by geographical boundaries, and future features may require operations such as distance checks, region intersections, and exploration-area calculations.

The database must therefore support both relational application data and spatial queries while remaining compatible with the existing deployment model.

## Decision

Sterna will use **PostgreSQL with the PostGIS extension** as its database.

PostgreSQL is responsible for relational application data, while PostGIS provides spatial data types, functions, and indexes.

PostGIS is used for spatial operations including:

- point-in-polygon queries;
- country detection from GPS coordinates;
- distance queries where required;
- future geographical operations related to POIs and explored areas.

Spatial indexes may be added to geographical columns where useful for query performance.

### Rationale and trade-offs

PostgreSQL provides a mature relational model that fits Sterna's users, discoveries, groups, memberships, and metadata.

PostGIS extends PostgreSQL with established geographical capabilities instead of requiring geometry operations to be reimplemented in application code.

This keeps spatial data and spatial queries in the same persistence layer and provides a better foundation for future mapping features.

The additional complexity of enabling and modeling data with PostGIS is considered acceptable because geographical processing is a core part of Sterna rather than an isolated edge case.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| PostgreSQL without PostGIS + `turf.js` | Simpler database setup; geometry handled in JavaScript | Spatial logic moves into application code; no native spatial indexing; less suitable as geographical requirements grow |
| MySQL / MariaDB | Mature relational databases with spatial capabilities | No clear advantage over PostgreSQL/PostGIS for the selected stack |
| NoSQL database | Flexible schema and simple horizontal scaling | Less suitable for strongly relational data and no clear benefit for Sterna's spatial model |

## Consequences

### Positive

- relational and geographical data are managed in one database;
- native point-in-polygon and distance operations;
- support for spatial indexes;
- less custom geometry logic in the backend;
- stronger foundation for future exploration-region and POI features;
- PostgreSQL remains the underlying database technology.

### Negative

- database setup and schema are slightly more complex;
- spatial queries require careful handling of coordinate systems and SRIDs;
- database migrations must account for PostGIS-specific schema elements.

## Future evolution

PostGIS can support more advanced features if Sterna grows, including:

- exploration-region intersections;
- proximity queries around POIs;
- spatial aggregation;
- more precise exploration grids;
- generation or preparation of geographical data for vector tiles.
