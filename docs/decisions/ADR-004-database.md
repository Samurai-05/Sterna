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

The data model is primarily relational, with clear relationships between users, discoveries, groups, and associated metadata.

Although the application handles geographical coordinates, the MVP does not require advanced database-side spatial processing. Geographical calculations such as country detection are handled separately in the backend.

## Decision

Sterna will use **PostgreSQL without PostGIS** as its relational database.

Geographical coordinates are stored as regular numeric latitude and longitude values.

PostgreSQL is responsible for storing structured application data and enforcing relational constraints.

Spatial processing is not part of the database responsibility for the MVP and is handled by the backend when required.

### Rationale and trade-offs

PostgreSQL provides a mature and reliable relational model that fits Sterna's application data well.

It supports:

- relational integrity;
- transactions;
- indexing;
- constraints;
- structured queries;
- straightforward integration with Node.js.

Using PostgreSQL without PostGIS keeps the database setup simpler and avoids introducing a spatial extension that is not required for the current MVP.

The trade-off is that advanced spatial operations are not available directly in the database. If the project later requires large-scale spatial queries, spatial indexing, or more complex geographical relationships, this decision may need to be revisited.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| PostgreSQL + PostGIS | Native spatial types, spatial indexing and advanced geographical queries | Additional complexity not required for the current MVP |
| MySQL / MariaDB | Mature relational databases with broad ecosystem support | Less aligned with the team's selected stack and no clear advantage for the project |
| NoSQL database | Flexible schema and simple horizontal scaling | Less suitable for strongly relational data such as users, groups, memberships and discoveries |

## Consequences

### Positive

- mature and widely supported relational database;
- simple deployment and local development;
- strong support for relational constraints and transactions;
- no additional PostGIS dependency;
- straightforward integration with the Node.js backend.

### Negative

- no native spatial types or spatial indexes;
- advanced geographical queries must be implemented outside the database;
- future spatial requirements may require a database migration or the addition of PostGIS.

## Future evolution

This decision should be revisited if Sterna requires advanced spatial capabilities such as:

- large-scale distance queries;
- spatial indexing;
- intersections between geographical objects;
- complex region queries;
- server-side geographical aggregation.

If such requirements emerge, PostgreSQL can be extended with PostGIS without replacing the underlying database technology.
