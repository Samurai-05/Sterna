-- Enables spatial data types and functions needed for
-- storing coordinates and performing map-related queries
-- (country detection, distance to points of interest, etc.)
CREATE EXTENSION IF NOT EXISTS postgis;