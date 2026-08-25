-- Enable PostGIS for spatial data support.
-- This extension is required before creating GEOMETRY columns.

CREATE EXTENSION IF NOT EXISTS postgis;
