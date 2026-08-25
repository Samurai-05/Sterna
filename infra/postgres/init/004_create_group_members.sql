-- Association between users and groups.
-- A membership also stores the user's role and whether the group is active.

CREATE TABLE group_members (
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (user_id, group_id),

    CONSTRAINT fk_group_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_group_members_group
        FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,

    CONSTRAINT group_members_role_check
        CHECK (role IN ('owner', 'member'))
);

-- Cross-row constraints such as "at most one active group per user"
-- and "at most one owner per group" are created in 007_create_indexes.sql.
