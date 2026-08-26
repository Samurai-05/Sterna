# Infrastructure — PostgreSQL + PostGIS & MinIO

Local development setup for the relational and spatial database (PostgreSQL + PostGIS) and
object storage (MinIO) services, via Docker Compose.

These services are consumed by the NestJS API (`api/`), which is the only component allowed
to reach them. The API service itself is defined in the same Compose stack — see
[`api/README.md`](../api/README.md).

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

3. Apply API-managed database migrations:

   ```bash
   docker compose exec api npm run migration:run
   ```

4. Check that everything is healthy:

   ```bash
   docker compose ps
   ```

## Services

| Service  | Purpose                          | Port(s)      |
|----------|-----------------------------------|--------------|
| api      | NestJS API — the only component that accesses the two services below | 3000 (development only; in production Nginx reaches it over the internal network) |
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
  interest. See `postgres/bootstrap/001_enable_postgis.sql`.
- The Node.js backend is the only component that accesses PostgreSQL + PostGIS.
- `001_enable_postgis.sql` runs only when the `postgres_data` volume is first
  created; it enables the `postgis` extension. Everything beyond that — tables,
  indexes, constraints — belongs to the API's TypeORM migrations (`api/src/migrations/`),
  never to a manual change against a running database.
- MinIO remains exclusively responsible for photo object storage; PostgreSQL +
  PostGIS stores the associated structured and geographical metadata.
- See `minio/README.md` for object storage conventions.
- No real secrets are committed — only `.env.example`. Copy it to
  `.env` locally (already in `.gitignore`).
