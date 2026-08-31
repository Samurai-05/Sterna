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
    is_personal NOT NULL,
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
* `group_id`: optional identifier of the group in which the discovery was
  originally created. It is retained as provenance and does not determine the
  maps on which the discovery currently appears.
* `is_personal`: indicates whether the discovery appears on its author's
  Personal map.
* `title`: discovery title.
* `description`: optional discovery description.
* `category`: optional discovery category.
* `location`: geographical position of the discovery.
* `image_object_key`: reference to the image stored in the object storage service.
* `discovered_at`: date and time when the discovery actually occurred.
* `created_at`: date and time when the discovery was created in Sterna.
* `updated_at`: date and time when the discovery was last modified.

### Discovery destinations

```text
is_personal = true -> appears on the author's Personal map

a row in DISCOVERY_GROUPS -> appears on the corresponding group map
```

A discovery may therefore appear on the Personal map, on one or more group
maps, or on both. The same `DISCOVERIES` row is reused for every selected map;
the discovery itself is not duplicated.

A Personal map is not stored as a group. It is a logical view containing the
user's discoveries whose `is_personal` value is `true`.

Every discovery must have at least one destination:

```text
is_personal = true
OR
at least one DISCOVERY_GROUPS row exists for the discovery
```

### Membership constraint

For every group map on which a discovery appears, its author must be a member
of that group. In other words, each `DISCOVERY_GROUPS` row must correspond to a
`GROUP_MEMBERS` row for the discovery's `user_id` and the selected `group_id`.

### Constraints

```text
PRIMARY KEY (id)

FK user_id -> USERS.id
FK group_id -> GROUPS.id
FK (user_id, group_id) -> GROUP_MEMBERS(user_id, group_id)
```

The composite foreign key applies only when the provenance `group_id` is not
null. Associations in `DISCOVERY_GROUPS` are validated against
`GROUP_MEMBERS` by the application.

---

## 6. DISCOVERY_GROUPS

```text
DISCOVERY_GROUPS(
    discovery_id PK FK -> DISCOVERIES.id NOT NULL,
    group_id PK FK -> GROUPS.id NOT NULL
)
```

### Attributes

* `discovery_id`: identifier of the discovery displayed on a group map.
* `group_id`: identifier of the group map on which the discovery appears.

### Constraints

```text
PRIMARY KEY (discovery_id, group_id)

FK discovery_id -> DISCOVERIES.id ON DELETE CASCADE
FK group_id -> GROUPS.id ON DELETE CASCADE
```

The composite primary key prevents a discovery from being associated with the
same group more than once. A discovery may be associated with zero or many
groups, and a group may contain zero or many discoveries.

---

## 7. POIS

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
active context is determined as follows:

* Personal map: the discovery belongs to the current user and has
  `is_personal = true`.
* Group map: the discovery has a `DISCOVERY_GROUPS` row for the active group.

The status is derived rather than stored on `POIS`, because the same POI may be
discovered on one personal or group map and undiscovered on another.
