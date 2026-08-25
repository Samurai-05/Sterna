-- User discoveries.
--
-- group_id IS NULL  -> Personal discovery
-- group_id IS NOT NULL -> Group discovery
--
-- If a discovery belongs to a group, its author must be a member of that group.

CREATE TABLE discoveries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT NOT NULL,
    group_id BIGINT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    category VARCHAR(30) NULL,

    -- WGS 84 coordinates (SRID 4326).
    -- PostGIS POINT order is: longitude, latitude.
    location GEOMETRY(POINT, 4326) NOT NULL,

    -- Object key/path of the discovery image in object storage (e.g. MinIO).
    image_object_key TEXT NOT NULL,

    -- When the discovery actually occurred.
    discovered_at TIMESTAMPTZ NOT NULL,

    -- When the record was created/updated in Sterna.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_discoveries_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_discoveries_group
        FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE SET NULL,

    -- If group_id is not NULL, (user_id, group_id) must exist in group_members.
    -- A membership cannot be deleted while the user still has discoveries in the group.
    -- Before leaving the group, the backend must either:
    -- - move the user's discoveries to the Personal map by setting group_id to NULL, or
    -- - delete the user's discoveries from the group.
    CONSTRAINT fk_discoveries_group_membership
        FOREIGN KEY (user_id, group_id)
        REFERENCES group_members(user_id, group_id)
        ON DELETE RESTRICT,

    CONSTRAINT discoveries_title_not_blank
        CHECK (BTRIM(title) <> ''),

    CONSTRAINT discoveries_image_object_key_not_blank
        CHECK (BTRIM(image_object_key) <> ''),

    CONSTRAINT discoveries_category_check
        CHECK (
            category IS NULL
            OR category IN (
                'Landscape',
                'Monument',
                'Food',
                'Animal',
                'Plant',
                'Culture',
                'Other'
            )
        )
);

CREATE TRIGGER trg_discoveries_set_updated_at
BEFORE UPDATE ON discoveries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
