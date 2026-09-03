# Functional Requirements

## 1. Priorities

The priorities below reflect the order established during the initial project
planning. They indicate importance, not implementation status: the delivered
application also includes several **SHOULD** requirements and extensions.

* **MUST**: required for the MVP;

* **SHOULD**: desirable if time allows;

* **COULD**: optional extension.

---

## 2. User Management

### FR-01 - Account Creation

**Priority: MUST**

The system must allow a user to create an account.

### FR-02 - Authentication

**Priority: MUST**

The system must allow a user to log in and log out.

### FR-03 - Profile

**Priority: SHOULD**

The system should provide a profile representing the personal exploration of
the currently signed-in user. It should display:

* points of interest discovered and overall POI progress;

* countries visited;

* discoveries by category;

* discovery activity over the previous six months;

* recent discoveries created by that user.

Discoveries contributed by other group members must not be counted as the
signed-in user's personal exploration.

---

## 3. Discovery Management

### FR-04 - Photo Selection

**Priority: MUST**

The user must be able to add a photo either by:

* selecting an existing photo from the device;

* taking a new photo directly from the Android application.

The web application must provide device file selection. The Android application
must provide both native camera capture and gallery selection.

### FR-05 - Discovery Creation

**Priority: MUST**

The user must be able to create a discovery containing at least:

* a photo;

* a latitude;

* a longitude;

* a date;

* a title;

* a category;

* an author.

A discovery may also contain a description.

### FR-06 - Automatic Location

**Priority: MUST**

When a selected photo contains usable GPS coordinates, the application must use
them to automatically propose the location of the discovery. When an original
capture date is available, it must also be proposed as the discovery date.

### FR-07 - Manual Location

**Priority: MUST**

If no GPS location is available or if the proposed location is incorrect, the user must be able to manually select a location on the map.

### FR-08 - Location Search

**Priority: SHOULD**

When selecting or correcting a location, the user should be able to search for
a country, region, city, village, or place and position the map on the selected
result.

### FR-09 - Discovery Category

**Priority: MUST**

The user must be able to select one of the following predefined categories:

* Landscape;

* Monument;

* Food;

* Animal;

* Plant;

* Culture;

* Other.

If no category is selected, **Other** must be assigned automatically.

### FR-10 - Edit a Discovery

**Priority: SHOULD**

The user should be able to edit a discovery they created, including its title,
category, description, location, personal-map association, and group
destinations.

### FR-11 - Delete a Discovery

**Priority: SHOULD**

The user should be able to delete a discovery they created.

---

## 4. Map and Exploration

### FR-12 - Interactive Map

**Priority: MUST**

The application must provide an interactive map as its main screen.

### FR-13 - Display and View Discoveries

**Priority: MUST**

Discoveries belonging to the active map must be displayed as markers when the zoom level allows it.

Selecting a discovery must display at least:

* the photo;

* the title;

* the author;

* the date;

* the category;

* the location;

* the map context;

* the description, if available.

### FR-14 - Explored Countries

**Priority: MUST**

At the global level, the application must allow the user to visualize explored countries.

A country containing at least one discovery in the active map must be considered explored.

One discovery is sufficient for the entire country to be considered explored.

### FR-15 - Active Map Content

**Priority: MUST**

The discoveries, explored countries, and discovered points of interest displayed on the map must correspond only to the currently active map.

### FR-16 - Current Location

**Priority: SHOULD**

The user should be able to recenter the map on their current location.

### FR-17 - Category Filtering

**Priority: SHOULD**

The user should be able to filter the discoveries displayed on the map by category.

### FR-18 - Geographic Search

**Priority: SHOULD**

The user should be able to search from the Map screen and center the map on the
selected result. Search must include accessible discoveries and points of
interest, and should also provide online geographic results such as countries,
regions, cities, villages, and places.

---

## 5. Points of Interest and Gamification

### FR-19 - Predefined Points of Interest

**Priority: MUST**

The system must contain a worldwide catalogue of predefined points of interest
representing iconic places. It must cover the 193 United Nations member states,
Palestine, and Vatican City, with at least one point of interest per covered
country and up to five where suitable source data is available.

The delivered generated catalogue contains 921 points of interest.

A point of interest must contain the information required for its location and consultation.

### FR-20 - Point of Interest Discovery

**Priority: MUST**

When a discovery is recorded within **150 metres** of a point of interest, that
point of interest must be considered discovered in every destination map that
contains the discovery.

A point of interest must not be considered discovered in another map automatically.

### FR-21 - Point of Interest Display and Consultation

**Priority: SHOULD**

All predefined points of interest should appear on the corresponding map and the user should be able to view their information. An undiscovered point of interest must use a greyed-out image; a discovered point of interest must use its colour image.

### FR-22 - Exploration Statistics

**Priority: SHOULD**

The system should display exploration statistics for the currently signed-in
user, including:

* number of countries visited;

* number of points of interest discovered;

* number of discoveries per category;

* discovery activity over the previous six months;

* recent discoveries.

The system should also provide a simple representation of exploration progress.

### FR-23 - Badges

**Priority: COULD**

The system could award badges when specific exploration objectives are reached.

### FR-24 - Challenges

**Priority: COULD**

The system could provide challenges encouraging users to discover new places or categories.

---

## 6. Groups and Active Map

### FR-25 - Group Creation

**Priority: MUST**

A user must be able to create a group and assign it a name.

### FR-26 - Join and Invite Users

**Priority: MUST**

Users must be able to invite other users to a group using an invitation code
and a corresponding QR code.

A user must be able to join a group using a valid invitation code. The Android
application must also allow the user to scan the invitation QR code.

### FR-27 - Active Map

**Priority: MUST**

The application must maintain one active map at a time.

The active map can be:

* the user's personal map;

* the map of a group the user belongs to.

The user must be able to identify the currently active map.

### FR-28 - Change Active Map

**Priority: MUST**

The user must be able to change the active map:

* directly from the Map screen;

* from the Groups screen.

The user must be able to select either their personal map or one of their groups.

### FR-29 - Group Map

**Priority: MUST**

Each group must have a shared map containing the discoveries recorded by its members.

The group's exploration progress must be based on the discoveries belonging to this map.

### FR-30 - Discovery Destination

**Priority: MUST**

A new discovery must be saved to at least one destination map: the user's personal map and/or one or more groups the user belongs to.

During discovery creation, the application must pre-select the destination(s) from the active map and allow the user to change the selection before saving.

### FR-31 - Discovery Author

**Priority: MUST**

Each discovery must retain the identity of the user who created it.

For group discoveries, the author must be visible when viewing the discovery.

### FR-32 - Group Members

**Priority: SHOULD**

Users should be able to view the members of a group they belong to.

### FR-33 - Leave a Group

**Priority: SHOULD**

A user should be able to leave a group.

If the group being left is the active map, the user's personal map must become the new active map.

---

## 7. Main Navigation

### FR-34 - Main Navigation

**Priority: MUST**

The application must provide access to the following five main sections:

* Map;

* Gallery;

* Add;

* Groups;

* Me.

The **Add** section must provide access to discovery creation.

The **Gallery** section must allow the user to browse discoveries and points of
interest outside the map. The **Me** section must represent the account and
personal exploration of the currently signed-in user.

---

## 8. Additional Delivered Requirements

The following requirements extend the initially prioritized scope and are part
of the delivered application.

### FR-35 - Profile Management

**Priority: SHOULD**

The user should be able to change their display name and add, replace, or remove
their profile photo.

### FR-36 - Password and Account Management

**Priority: SHOULD**

The user should be able to change their password and permanently delete their
account after confirming their current password.

Changing a password must invalidate existing sessions. Account deletion must
remove the user's discoveries and owned photos. Ownership of a group with other
members must be transferred before the account is removed; a group with no
remaining member must be deleted.

### FR-37 - Gallery Browsing and Filtering

**Priority: SHOULD**

The Gallery should provide a compact photo grid and a detailed card view. The
user should be able to search its content and filter it by category, points of
interest, personal map, a specific group, or all accessible groups.

### FR-38 - Gallery Photo Viewer

**Priority: SHOULD**

Selecting a discovery in the Gallery should open an immersive photo viewer. The
user should be able to navigate through the current filtered gallery selection
and open the displayed discovery at its location on the appropriate map.

### FR-39 - Group Administration

**Priority: SHOULD**

The owner should be able to edit or delete their group. A member who is not the
owner must not be able to perform those operations.

### FR-40 - Android Native Interactions

**Priority: SHOULD**

The Android application should integrate native photo capture and gallery
selection, current-location access, system back navigation, and group-invitation
QR-code scanning.
