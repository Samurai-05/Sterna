# MinIO conventions

## Purpose

MinIO stores photo files (originals and/or compressed versions).
PostgreSQL + PostGIS never stores binary data — only metadata and a reference (object key)
to the file stored here.

## Bucket

Default bucket: `observations` (see `MINIO_BUCKET_NAME` in `.env`).
Created automatically on startup by the `minio-init` service.

## Object key convention

```
photos/{uuid}.{jpg|png|webp}
```

The key is minted by the API on upload and returned to the client, which passes
it back as `DISCOVERIES.image_object_key` when it creates the discovery. It
cannot embed the user or the discovery: a photo is uploaded *before* the
discovery that references it exists, and — until authentication lands — there is
no user to name either.

Because the key lives in the database, new keys can gain a `{userId}/` segment
later without migrating the objects already stored under the current scheme.

## Access

MinIO is not meant to be exposed publicly. Files are served through the backend
(`GET /api/photos/{uuid}.{ext}`), which streams the object out of the bucket. It
proxies rather than issuing a pre-signed URL because MinIO publishes no port in
production — per ADR-007 only Nginx is reachable — so a pre-signed URL would not
resolve for a client. It is also where the permission check belongs once
authentication exists.

Uploads are re-encoded before they are stored, which drops every EXIF/XMP/ICC
block (NFR-27) and validates that the bytes really are a JPEG, PNG or WebP under
10 MB (NFR-21).

Console (admin UI): http://localhost:9001
API endpoint: http://localhost:9000
