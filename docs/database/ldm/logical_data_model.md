# Logical Data Model

## 1. Purpose

This document defines the logical data model for the Sterna MVP.

It is derived from the conceptual data model and introduces:

* foreign keys;
* relational tables;
* logical constraints;
* nullable relationships;
* uniqueness and nullability constraints.

---

## 2. USERS

```text
USERS(
    id PK,
    email UNIQUE NOT NULL,
    password_hash NOT NULL,
    user_name NOT NULL,
    created_at NOT NULL,
    updated_at NOT NULL
)
```

### Attributes

* `id`: unique identifier of the user.
* `email`: email address used for authentication.
* `password_hash`: hashed user password.
* `user_name`: name displayed in the application.
* `created_at`: date and time when the user account was created.
* `updated_at`: date and time when the user account was last modified.

### Constraints

```text
PRIMARY KEY (id)
```

`user_name` is intentionally not unique, as multiple users may use the same display name.

---

## 3. GROUPS

```text
GROUPS(
    id PK,
    name NOT NULL,
    description NULL,
    created_at NOT NULL,
    updated_at NOT NULL
)
```

### Attributes

* `id`: unique identifier of the group.
* `name`: group name.
* `description`: optional group description.
* `created_at`: date and time when the group was created.
* `updated_at`: date and time when the group was last modified.

### Constraints

```text
PRIMARY KEY (id)
```

`name` is not unique globally. Different users may therefore create groups with the same name.

---

## 4. GROUP_MEMBERS

```text
GROUP_MEMBERS(
    user_id PK FK -> USERS.id NOT NULL,
    group_id PK FK -> GROUPS.id NOT NULL,
    role NOT NULL,
    joined_at NOT NULL,
    is_active NOT NULL
)
```

### Attributes

* `user_id`: identifier of the user belonging to the group.
* `group_id`: identifier of the group.
* `role`: role of the user in the group, for example `owner` or `member`.
* `joined_at`: date and time when the user joined the group.
* `is_active`: indicates whether this group is currently the active group for the user.

### Active group behavior

For a given user, at most one membership may have:

```text
is_active = true
```

If none of the user's group memberships is active, the application uses the user's Personal map.

Example:

```text
Emma
├── Alps Adventure     is_active = false
├── Paris Weekend      is_active = true
└── Sicily Road Trip   is_active = false
```

If all memberships have `is_active = false`, `Personal` is the active map.

### Constraints

```text
PRIMARY KEY (user_id, group_id)

FK user_id -> USERS.id
FK group_id -> GROUPS.id
```

The composite primary key ensures that a user can belong to the same group only once.

---

## 5. DISCOVERIES

```text
DISCOVERIES(
    id PK,
    user_id FK -> USERS.id NOT NULL,
    group_id FK -> GROUPS.id NULL,
    title NOT NULL,
    description NULL,
    category NULL,
    location NOT NULL,
    image_object_key NOT NULL,
    discovered_at NOT NULL,
    created_at NOT NULL,
    updated_at NOT NULL
)
```

### Attributes

* `id`: unique identifier of the discovery.
* `user_id`: identifier of the user who created the discovery.
* `group_id`: identifier of the group to which the discovery belongs.
* `title`: discovery title.
* `description`: optional discovery description.
* `category`: optional discovery category.
* `location`: geographical position of the discovery.
* `image_object_key`: reference to the image stored in the object storage service.
* `discovered_at`: date and time when the discovery actually occurred.
* `created_at`: date and time when the discovery was created in Sterna.
* `updated_at`: date and time when the discovery was last modified.

### Personal vs shared discovery

```text
group_id = NULL
-> Personal discovery

group_id != NULL
-> Group discovery
```

A Personal map is therefore not stored as a group. It is a logical view containing the user's discoveries whose `group_id` is `NULL`.

### Membership constraint

If a discovery belongs to a group, its author must be a member of that group.

### Constraints

```text
PRIMARY KEY (id)

FK user_id -> USERS.id
FK group_id -> GROUPS.id
```

---

## 6. POIS

```text
POIS(
    id PK,
    title NOT NULL,
    description NULL,
    location NOT NULL,
    image_url NULL,
    created_at NOT NULL
)
```

### Attributes

* `id`: unique identifier of the point of interest.
* `title`: POI title.
* `description`: optional POI description.
* `location`: geographical position of the POI.
* `image_url`: optional URL of the illustrative image.
* `created_at`: date and time when the POI was added to the system.

### Constraints

```text
PRIMARY KEY (id)
```

### Spatial relationship with discoveries

There is intentionally no relational foreign key between `DISCOVERIES` and `POIS`.

Whether a POI has been discovered is determined spatially by comparing:

```text
DISCOVERIES.location
        ↕
POIS.location
```

This relationship is evaluated with a PostGIS distance query. For the MVP, a
discovery within 150 metres reveals the POI in the same active context. The
status is derived rather than stored on `POIS`, because the same POI may be
discovered on one personal or group map and undiscovered on another.
