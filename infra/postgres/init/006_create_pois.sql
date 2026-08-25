-- Points of interest displayed by Sterna.
--
-- There is intentionally no foreign key between discoveries and POIs.
-- Whether a POI has been discovered is determined spatially with PostGIS.

CREATE TABLE pois (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    title VARCHAR(150) NOT NULL,
    description TEXT NULL,

    -- WGS 84 coordinates (SRID 4326).
    -- PostGIS POINT order is: longitude, latitude.
    location GEOMETRY(POINT, 4326) NOT NULL,

    image_url TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pois_title_not_blank
        CHECK (BTRIM(title) <> ''),

    CONSTRAINT pois_image_url_not_blank
        CHECK (image_url IS NULL OR BTRIM(image_url) <> '')
);
