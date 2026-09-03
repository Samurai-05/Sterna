# ADR-003 - Backend Architecture

## Status

Accepted

## Context

Sterna requires a backend to manage application data, business logic, photo storage, user and group access, and geographical data workflows.

The project is developed by a small team over a limited period of time. The backend architecture must therefore remain simple to develop, test, deploy, and maintain while keeping responsibilities clearly separated.

The client must not communicate directly with the database or object storage. Access control and business rules must remain centralized on the server.

## Decision

The backend will consist of a **single Node.js API service**, organized as a modular monolith.

The API service is responsible for:

- exposing the application API to the frontend;
- implementing business logic;
- validating incoming data;
- accessing PostgreSQL + PostGIS;
- accessing MinIO for photo storage;
- orchestrating spatial queries executed by PostGIS and interpreting their results;
- enforcing authorization rules for users and groups.

The frontend communicates exclusively with the API for Sterna application data.

PostgreSQL + PostGIS and MinIO are not directly accessible from the client.

Node.js remains responsible for workflow orchestration, validation, authorization, and business decisions. PostGIS performs spatial operations on geographical data persisted in PostgreSQL, including containment and proximity queries when required.

The specific Node.js web framework is outside this ADR's scope; the subsequent
[ADR-008](ADR-008-backend-framework.md) records the selection of NestJS and
TypeORM.

### Rationale and trade-offs

A single API service keeps deployment and development simple while still allowing the codebase to be structured into separate modules such as:

- authentication and users;
- discoveries;
- groups;
- POIs;
- geographical workflows and PostGIS query orchestration;
- photo management.

This architecture avoids the operational overhead of microservices while maintaining clear internal boundaries.

Centralizing database and object-storage access in the API also prevents credentials and authorization logic from being exposed to the client.

The trade-off is that the API service becomes a central component of the system. As the application grows, care must be taken to keep modules sufficiently separated and prevent the codebase from becoming tightly coupled.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| Microservices | Independent deployment and scaling of individual services | Excessive operational and development complexity for the scope of the project |
| Serverless functions | Automatic scaling and limited infrastructure management | More fragmented architecture and increased dependency on a cloud provider |
| Direct client access to database or storage | Fewer backend endpoints to implement | Exposes infrastructure to the client and makes authorization harder to enforce consistently |

## Consequences

### Positive

- simple development and deployment model;
- centralized business logic and authorization;
- PostgreSQL + PostGIS and MinIO credentials remain server-side;
- easier integration testing;
- suitable complexity for the project duration and team size.

### Negative

- the API service is a central dependency;
- poor internal modularity could make the backend harder to maintain as it grows;
- individual backend domains cannot be deployed or scaled independently.

## Future evolution

The modular structure should allow individual responsibilities to be extracted into separate services if future scale or operational requirements justify it.
