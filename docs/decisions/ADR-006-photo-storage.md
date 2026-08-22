# ADR-006 - Photo Storage

## Status

Accepted

## Context

Photos are a central part of Sterna discoveries.

They are relatively large binary files and have different storage and access requirements from structured application data.

The project requires a storage solution that:

- integrates easily with the backend;
- can run locally and on the school VM;
- keeps photo storage separate from PostgreSQL;
- supports controlled access to private photos;
- can later be migrated to a managed object-storage provider without major application changes.

## Decision

Sterna will use **MinIO** as its photo storage system.

MinIO will run as a self-hosted container and expose an **S3-compatible API**.

The backend is responsible for communicating with MinIO.

PostgreSQL stores only the metadata associated with a photo, including information such as:

- the discovery identifier;
- the owner;
- the MinIO object key;
- the MIME type or other relevant file metadata.

The binary image itself is stored exclusively in MinIO.

```text
Discovery
   |
   +-- metadata -----> PostgreSQL
   |
   +-- photo --------> MinIO
```

Photo buckets are not intended to be publicly accessible.

When direct photo access is required, the backend may issue temporary presigned URLs or proxy the resource according to the application's authorization rules.

### Rationale and trade-offs

MinIO provides an object-storage model specifically designed for files and exposes the standard S3 API.

This provides a clean separation between relational application data and binary media.

Using the S3 API also reduces vendor lock-in. The backend could later use another S3-compatible service with limited changes.

Self-hosting MinIO is suitable for the project because it:

- avoids requiring an external paid cloud service;
- runs easily with Docker Compose;
- provides an administration interface useful during development;
- supports presigned URLs and private buckets.

The trade-off is that Sterna becomes responsible for operating and persisting the object-storage service.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| Files stored directly on the backend filesystem | Very simple implementation | Tight coupling to the server filesystem, weaker portability and scalability |
| Photos stored as PostgreSQL BLOBs | Single persistence system | Large binary files increase database size and complicate database management |
| Managed S3-compatible cloud storage | High durability and scalability with little infrastructure management | External dependency, possible cost, credentials and availability outside the school infrastructure |

## Consequences

### Positive

- clear separation between structured data and binary files;
- S3-compatible interface;
- easy integration with Node.js;
- private photo storage;
- support for temporary presigned access;
- easier future migration to a managed object-storage provider.

### Negative

- one additional service must be deployed and maintained;
- MinIO data volumes must be persisted correctly;
- available VM disk space limits total photo storage;

## Future evolution

MinIO may later be replaced by a managed S3-compatible service if storage volume, availability, or operational requirements increase.

Because the application uses the S3 API, this migration should require limited changes to the backend.
