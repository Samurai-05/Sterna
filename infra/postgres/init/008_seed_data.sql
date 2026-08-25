-- Initial reference data for development.
-- No users, groups, memberships or discoveries are seeded here because those
-- are user-generated data.
--
-- Coordinates are stored as POINT(longitude, latitude).

INSERT INTO pois (title, description, location, image_url)
VALUES
    (
        'Eiffel Tower',
        'Landmark in Paris, France.',
        ST_SetSRID(ST_MakePoint(2.2945, 48.8584), 4326),
        NULL
    ),
    (
        'Parthenon',
        'Ancient temple on the Acropolis of Athens, Greece.',
        ST_SetSRID(ST_MakePoint(23.7267, 37.9715), 4326),
        NULL
    ),
    (
        'Mont Blanc',
        'Highest mountain in the Alps.',
        ST_SetSRID(ST_MakePoint(6.8652, 45.8326), 4326),
        NULL
    ),
    (
        'Alhambra',
        'Historic palace and fortress complex in Granada, Spain.',
        ST_SetSRID(ST_MakePoint(-3.5881, 37.1761), 4326),
        NULL
    );
