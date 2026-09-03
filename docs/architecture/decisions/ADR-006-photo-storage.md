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

PostgreSQL stores only the metadata associated with a photo, including:

- the MinIO object key;
- the uploader;
- the normalized MIME type and stored byte size;
- creation time.

Discoveries and user profiles reference the generated object key from their
own rows. The photo metadata table therefore does not need a discovery ID, and
one object can be checked independently of how it is referenced.

The binary image itself is stored exclusively in MinIO.

```text
Web / Android client
         |
         v
 Authenticated API
    /          \
   v            v
PostgreSQL     MinIO
ownership      original and
and references display variants
```

Photo buckets are not intended to be publicly accessible.

Photo access is proxied through the authenticated
`GET /api/photos/:filename` endpoint. Before streaming an object, the backend
checks whether the caller uploaded it or can access a personal/group discovery
that references it. MinIO is private on the internal Compose network, so
presigned URLs are not used by the delivered deployment.

Uploads accept JPEG, PNG, and WebP images up to 10 MB. The API extracts the
useful EXIF date and location before using Sharp to re-encode the original
without metadata. It also generates map, card, and detail variants to avoid
serving unnecessarily large images.

### Rationale and trade-offs

MinIO provides an object-storage model specifically designed for files and exposes the standard S3 API.

This provides a clean separation between relational application data and binary media.

Using the S3 API also reduces vendor lock-in. The backend could later use another S3-compatible service with limited changes.

Self-hosting MinIO is suitable for the project because it:

- avoids requiring an external paid cloud service;
- runs easily with Docker Compose;
- provides an administration interface useful during development;
- supports private buckets and server-side streaming.

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
- access controlled by the API for both owners and authorised group members;
- generated display variants and removal of embedded metadata;
- easier future migration to a managed object-storage provider.

### Negative

- one additional service must be deployed and maintained;
- MinIO data volumes must be persisted correctly;
- available VM disk space limits total photo storage.

## Implementation status

The decision is fully implemented. The `photos` table records ownership and
metadata, while discovery and avatar rows retain object-key references.
Deleting a discovery, replacing an avatar, or deleting an account cleans up
the corresponding object family when it is no longer needed. A periodic sweep
also removes uploads older than 24 hours that were never attached to a
discovery or profile.

## Future evolution

MinIO may later be replaced by a managed S3-compatible service if storage volume, availability, or operational requirements increase.

Because the application uses the S3 API, this migration should require limited changes to the backend.
