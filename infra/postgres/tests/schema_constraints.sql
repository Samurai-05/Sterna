-- Sterna MVP schema constraint tests
-- PostgreSQL + PostGIS
--
-- This script validates the main database constraints of the MVP.
-- It runs inside a transaction and finishes with ROLLBACK, so no test data
-- remains in the database.
--
-- Expected result:
--   The script completes without ERROR and prints NOTICE messages ending with:
--   "All schema constraint tests passed."

BEGIN;

DO $$
DECLARE
    user_1_id BIGINT;
    user_2_id BIGINT;
    user_3_id BIGINT;
    group_1_id BIGINT;
    group_2_id BIGINT;
BEGIN
    --------------------------------------------------------------------------
    -- 1. Create test users
    --------------------------------------------------------------------------

    INSERT INTO users (email, password_hash, user_name)
    VALUES ('schema-test-1@sterna.local', 'test-hash', 'Schema Test User 1')
    RETURNING id INTO user_1_id;

    INSERT INTO users (email, password_hash, user_name)
    VALUES ('schema-test-2@sterna.local', 'test-hash', 'Schema Test User 2')
    RETURNING id INTO user_2_id;

    INSERT INTO users (email, password_hash, user_name)
    VALUES ('schema-test-3@sterna.local', 'test-hash', 'Schema Test User 3')
    RETURNING id INTO user_3_id;

    RAISE NOTICE 'PASS: users can be created';


    --------------------------------------------------------------------------
    -- 2. Duplicate email must be rejected
    --------------------------------------------------------------------------

    BEGIN
        INSERT INTO users (email, password_hash, user_name)
        VALUES ('schema-test-1@sterna.local', 'test-hash', 'Duplicate Email');

        RAISE EXCEPTION 'FAIL: duplicate email was accepted';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'PASS: duplicate email is rejected';
    END;


    --------------------------------------------------------------------------
    -- 3. Create test groups
    --------------------------------------------------------------------------

    INSERT INTO groups (name, description)
    VALUES ('Schema Test Group 1', 'Temporary group used by schema tests')
    RETURNING id INTO group_1_id;

    INSERT INTO groups (name, description)
    VALUES ('Schema Test Group 2', 'Temporary group used by schema tests')
    RETURNING id INTO group_2_id;

    RAISE NOTICE 'PASS: groups can be created';


    --------------------------------------------------------------------------
    -- 4. Create valid memberships
    --------------------------------------------------------------------------

    -- User 1 owns Group 1 and has it as active.
    INSERT INTO group_members (user_id, group_id, role, is_active)
    VALUES (user_1_id, group_1_id, 'owner', TRUE);

    -- User 2 owns Group 2.
    INSERT INTO group_members (user_id, group_id, role, is_active)
    VALUES (user_2_id, group_2_id, 'owner', FALSE);

    -- User 1 also belongs to Group 2, but it is not active.
    INSERT INTO group_members (user_id, group_id, role, is_active)
    VALUES (user_1_id, group_2_id, 'member', FALSE);

    RAISE NOTICE 'PASS: valid group memberships can be created';


    --------------------------------------------------------------------------
    -- 5. A user may have at most one active group
    --------------------------------------------------------------------------

    BEGIN
        UPDATE group_members
        SET is_active = TRUE
        WHERE user_id = user_1_id
          AND group_id = group_2_id;

        RAISE EXCEPTION 'FAIL: user was allowed to have two active groups';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'PASS: a user cannot have two active groups';
    END;


    --------------------------------------------------------------------------
    -- 6. A group may have at most one owner
    --------------------------------------------------------------------------

    BEGIN
        INSERT INTO group_members (user_id, group_id, role, is_active)
        VALUES (user_2_id, group_1_id, 'owner', FALSE);

        RAISE EXCEPTION 'FAIL: group was allowed to have two owners';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'PASS: a group cannot have two owners';
    END;


    --------------------------------------------------------------------------
    -- 7. Create a valid Personal discovery
    --------------------------------------------------------------------------

    INSERT INTO discoveries (
        user_id,
        group_id,
        title,
        description,
        category,
        location,
        image_object_key,
        discovered_at
    )
    VALUES (
        user_1_id,
        NULL,
        'Personal test discovery',
        'Temporary Personal discovery used by schema tests',
        'Landscape',
        ST_SetSRID(ST_MakePoint(6.6412, 46.7785), 4326),
        'schema-tests/personal.jpg',
        NOW()
    );

    RAISE NOTICE 'PASS: Personal discovery can be created';


    --------------------------------------------------------------------------
    -- 8. Create a valid Group discovery
    --------------------------------------------------------------------------

    INSERT INTO discoveries (
        user_id,
        group_id,
        title,
        description,
        category,
        location,
        image_object_key,
        discovered_at
    )
    VALUES (
        user_1_id,
        group_1_id,
        'Group test discovery',
        'Temporary Group discovery used by schema tests',
        'Monument',
        ST_SetSRID(ST_MakePoint(6.6323, 46.5197), 4326),
        'schema-tests/group.jpg',
        NOW()
    );

    RAISE NOTICE 'PASS: group member can create a Group discovery';


    --------------------------------------------------------------------------
    -- 9. A non-member cannot create a discovery in a group
    --------------------------------------------------------------------------

    BEGIN
        INSERT INTO discoveries (
            user_id,
            group_id,
            title,
            category,
            location,
            image_object_key,
            discovered_at
        )
        VALUES (
            user_3_id,
            group_1_id,
            'Invalid non-member discovery',
            'Other',
            ST_SetSRID(ST_MakePoint(6.6323, 46.5197), 4326),
            'schema-tests/invalid.jpg',
            NOW()
        );

        RAISE EXCEPTION 'FAIL: non-member was allowed to create a Group discovery';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'PASS: non-member cannot create a Group discovery';
    END;


    --------------------------------------------------------------------------
    -- 10. Membership cannot be deleted while Group discoveries still exist
    --------------------------------------------------------------------------
    --
    -- This validates the intended workflow:
    -- before a user leaves a group, the backend must either move their
    -- discoveries to Personal (group_id = NULL) or delete them.

    BEGIN
        DELETE FROM group_members
        WHERE user_id = user_1_id
          AND group_id = group_1_id;

        RAISE EXCEPTION
            'FAIL: membership was deleted while Group discoveries still existed';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE
                'PASS: membership cannot be deleted while Group discoveries exist';
    END;


    --------------------------------------------------------------------------
    -- 11. PostGIS geometry is stored with the expected SRID
    --------------------------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM discoveries
        WHERE ST_SRID(location) <> 4326
    ) THEN
        RAISE EXCEPTION 'FAIL: a discovery location does not use SRID 4326';
    END IF;

    RAISE NOTICE 'PASS: discovery locations use SRID 4326';


    --------------------------------------------------------------------------
    -- Final result
    --------------------------------------------------------------------------

    RAISE NOTICE 'All schema constraint tests passed.';
END
$$;

-- Remove all data created by this test script.
ROLLBACK;
