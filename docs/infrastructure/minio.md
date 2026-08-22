# MinIO conventions

## Purpose

MinIO stores photo files (originals and/or compressed versions).
PostgreSQL never stores binary data — only a reference (object key)
to the file stored here.

## Bucket

Default bucket: `observations` (see `MINIO_BUCKET_NAME` in `.env`).
Created automatically on startup by the `minio-init` service.

## Object key convention

```
{userId}/{observationId}/original.{ext}
{userId}/{observationId}/compressed.{ext}
```

## Access

MinIO is not meant to be exposed publicly. Files must be served
through the backend, which checks permissions before returning the
file (proxy) or generating a short-lived pre-signed URL.

Console (admin UI): http://localhost:9001
API endpoint: http://localhost:9000