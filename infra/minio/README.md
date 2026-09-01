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
cannot embed the discovery: a photo is uploaded *before* the discovery that
references it exists.

It does not embed the user either, and it does not need to. **Ownership lives in
the `photos` table** (`object_key`, `user_id`, `content_type`), which
`POST /api/photos` writes and which every later question about an object is
answered from — may this caller attach it, read it, delete it. That is the
arrangement ADR-006 specified from the start: "PostgreSQL stores only the
metadata associated with a photo, including … the owner, the MinIO object key".

Putting the owner in the key instead would not have worked anyway: the key is
not a secret. `GET /api/groups/{id}/discoveries` returns it in full to every
member of a shared map, so it identifies an object but authorises nothing.

## Access

MinIO is not meant to be exposed publicly. Files are served through the backend
(`GET /api/photos/{uuid}.{ext}`), which streams the object out of the bucket. It
proxies rather than issuing a pre-signed URL because MinIO publishes no port in
production — per ADR-007 only Nginx is reachable — so a pre-signed URL would not
resolve for a client. It is also where the permission check lives: a bearer
token gets a caller past the guard, and `PhotosService.canRead()` then decides
whether *this* caller may see *these* bytes — they uploaded the object, or it
belongs to a discovery shared into a group they are still in. Anything else is a
404, the same answer a key that does not exist gets (NFR-19, NFR-24).

Uploads are re-encoded before they are stored, which drops every EXIF/XMP/ICC
block (NFR-27) and validates that the bytes really are a JPEG, PNG or WebP under
10 MB (NFR-21).

Console (admin UI): http://localhost:9001
API endpoint: http://localhost:9000
