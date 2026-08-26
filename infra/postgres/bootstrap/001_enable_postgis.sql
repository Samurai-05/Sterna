-- Enable PostGIS for spatial data support.
-- Application tables are managed by TypeORM migrations in api/src/migrations.

CREATE EXTENSION IF NOT EXISTS postgis;
