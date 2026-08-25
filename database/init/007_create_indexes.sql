-- Indexes and cross-row uniqueness constraints.

-- A user can have at most one active group.
-- If no membership is active, the Personal map is considered active.
CREATE UNIQUE INDEX uq_group_members_one_active_group_per_user
    ON group_members (user_id)
    WHERE is_active = TRUE;

-- A group can have at most one owner.
-- The application must still ensure that each group has an owner.
CREATE UNIQUE INDEX uq_group_members_one_owner_per_group
    ON group_members (group_id)
    WHERE role = 'owner';

-- Speeds up queries that retrieve all members of a group.
CREATE INDEX idx_group_members_group_id
    ON group_members (group_id);

-- Supports lookups by author and membership-related FK operations.
CREATE INDEX idx_discoveries_user_group
    ON discoveries (user_id, group_id);

-- Speeds up loading all discoveries for a group.
CREATE INDEX idx_discoveries_group_id
    ON discoveries (group_id);

-- Useful for chronological discovery queries.
CREATE INDEX idx_discoveries_discovered_at
    ON discoveries (discovered_at);

-- Spatial indexes used by PostGIS queries.
CREATE INDEX idx_discoveries_location
    ON discoveries
    USING GIST (location);

CREATE INDEX idx_pois_location
    ON pois
    USING GIST (location);
