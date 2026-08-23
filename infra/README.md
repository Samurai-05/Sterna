# Infrastructure — PostgreSQL + PostGIS & MinIO

Local development setup for the relational and spatial database (PostgreSQL + PostGIS) and
object storage (MinIO) services, via Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Setup

1. Copy the environment file and fill in real values:

   ```bash
   cp .env.example .env
   ```

2. Start the services:

   ```bash
   docker compose up -d
   ```

3. Check that everything is healthy:

   ```bash
   docker compose ps
   ```

## Services

| Service  | Purpose                          | Port(s)      |
|----------|-----------------------------------|--------------|
| postgres | Relational database with PostGIS spatial extension | 5432         |
| minio    | S3-compatible object storage      | 9000 (API), 9001 (console) |

## Connection details (from the backend)

Use the values from `.env`. Inside the Docker network, services are
reachable by their service name (`postgres`, `minio`), not `localhost`.

Example connection string for Postgres:

```
postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
```

MinIO endpoint (from another container): `http://minio:9000`

## Data persistence

Data is stored in named Docker volumes (`postgres_data`, `minio_data`)
and survives `docker compose down`. To fully reset:

```bash
docker compose down -v
```

## Notes

- PostgreSQL + PostGIS provides relational storage, geographical data storage,
  and spatial queries such as country detection and distance to points of
  interest. See `postgres/init/001-init-extensions.sql`.
- The Node.js backend is the only component that accesses PostgreSQL + PostGIS.
- MinIO remains exclusively responsible for photo object storage; PostgreSQL +
  PostGIS stores the associated structured and geographical metadata.
- See `minio/README.md` for object storage conventions.
- No real secrets are committed — only `.env.example`. Copy it to
  `.env` locally (already in `.gitignore`).
