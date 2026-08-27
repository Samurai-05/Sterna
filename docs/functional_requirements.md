# Functional Requirements

## 1. Priorities

The requirements use the following priorities:

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

The system should provide a user profile displaying the main exploration statistics.

---

## 3. Discovery Management

### FR-04 - Photo Selection

**Priority: MUST**

The user must be able to add a photo either by:

* selecting an existing photo from the device;

* taking a new photo directly from the application.

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

When a selected photo contains usable GPS coordinates, the application must use them to automatically propose the location of the discovery.

### FR-07 - Manual Location

**Priority: MUST**

If no GPS location is available or if the proposed location is incorrect, the user must be able to manually select a location on the map.

### FR-08 - Location Search

**Priority: SHOULD**

When manually selecting a location, the user should be able to search for a city, region, or place.

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

The user should be able to edit a discovery they created, including its title, category, description, and location.

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

* the description, if available.

### FR-14 - Explored Countries

**Priority: MUST**

At the global level, the application must allow the user to visualize explored countries.

A country containing at least one discovery in the active map must be considered explored.

For the MVP, one discovery is sufficient for the entire country to be considered explored.

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

The user should be able to search for a location from the Map screen and center the map on the selected result.

---

## 5. Points of Interest and Gamification

### FR-19 - Predefined Points of Interest

**Priority: MUST**

The system must contain a limited selection of predefined points of interest representing iconic places.

A point of interest must contain the information required for its location and consultation.

### FR-20 - Point of Interest Discovery

**Priority: MUST**

When a discovery is recorded within the defined discovery radius of a point of interest, that point of interest must be considered discovered in the corresponding map.

A point of interest must not be considered discovered in another map automatically.

### FR-21 - Point of Interest Display and Consultation

**Priority: SHOULD**

All predefined points of interest should appear on the corresponding map and the user should be able to view their information. An undiscovered point of interest must use a greyed-out image; a discovered point of interest must use its colour image.

### FR-22 - Exploration Statistics

**Priority: SHOULD**

The system should display simple exploration statistics, including:

* number of discoveries;

* number of countries visited;

* number of points of interest discovered;

* number of discoveries per category.

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

Users must be able to invite other users to a group using an invitation code or link.

A user must be able to join a group using a valid invitation.

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

A new discovery must be recorded only in the active map.

During discovery creation, the application must clearly indicate the destination map and allow the user to change it before saving.

If another destination is selected, it becomes the active map.

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

* Collection;

* Add;

* Groups;

* Profile.

The **Add** section must provide access to discovery creation.

The **Collection** section must allow the user to browse discoveries in a list or collection view in addition to the map.
