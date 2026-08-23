# Non-Functional Requirements

## 1. Priorities

The requirements use the following priorities:

* **MUST**: required for the MVP;

* **SHOULD**: desirable if time allows;

* **COULD**: optional or lower-priority quality requirement.

---

## 2. Platform and Compatibility

### NFR-01 - Shared Frontend and Android Target

**Priority: MUST**

The application must use a shared React/TypeScript frontend built with Vite, targeting the web as an installable PWA and mobile platforms through Capacitor.

For the MVP, the mobile target must be distributable and installable as an **APK** file.

It must:

* be installable on **Android 10 or later**;

* be launchable from Android like a standard application;

* not require an external browser to be opened for use.

### NFR-02 - Mobile-First Interface

**Priority: MUST**

The interface must be designed primarily for use on Android smartphones.

All MVP features must be usable on screen widths between **360 px and 430 px CSS**, without global horizontal scrolling.

### NFR-03 - Responsive Design

**Priority: SHOULD**

The application should remain usable on different smartphone and tablet screen sizes.

Between **360 px and 1280 px CSS in width**, no main feature should become inaccessible and no global horizontal scrolling should be required.

---

## 3. Usability

### NFR-04 - Fast Discovery Creation

**Priority: MUST**

When a photo contains valid GPS coordinates, the user must be able to save a discovery in a **maximum of 3 navigation or validation actions** after selecting the photo.

### NFR-05 - Non-Blocking Category

**Priority: MUST**

Not manually selecting a category must never prevent a discovery from being saved.

If no category is selected, the **Other** category must be assigned automatically in **100% of cases**.

### NFR-06 - Touch Interface

**Priority: MUST**

Main interactive areas must measure at least **44 × 44 CSS px**.

A spacing of at least **8 CSS px** must be maintained between two distinct interactive areas when their proximity could lead to a selection error.

### NFR-07 - Fast Active Context Switching

**Priority: SHOULD**

From the Map, the user should be able to switch between their personal map and one of their group maps in a **maximum of 2 interactions**.

### NFR-08 - Terminology Consistency

**Priority: SHOULD**

The same terms should be used throughout the interface to refer to the main concepts.

The following terms should be used consistently:

* discovery;

* group;

* active map;

* point of interest;

* category.

---

## 4. Performance

### NFR-09 - Initial Loading

**Priority: SHOULD**

The application should become usable in less than **3 seconds** on a simulated standard 4G connection.

The maximum tolerated loading time should be **5 seconds** under degraded network conditions.

### NFR-10 - Image Loading

**Priority: SHOULD**

Displaying a thumbnail or preview should not systematically require loading the original full-resolution image.

### NFR-11 - Progressive Loading

**Priority: SHOULD**

Images corresponding to discoveries that are not visible on screen should not be loaded before they are needed.

This behavior must be verifiable through a network test of the application.

### NFR-12 - Map Fluidity

**Priority: SHOULD**

Map panning and zooming interactions should maintain an average frame rate of at least **30 frames per second** with up to **500 loaded discoveries**.

### NFR-13 - Context Switching

**Priority: SHOULD**

After selecting a new active context, the map should display the corresponding data in less than **2 seconds** on a standard 4G connection, for a context containing up to **500 discoveries**.

---

## 5. Data Management and Consistency

### NFR-14 - Geographic Data

**Priority: MUST**

The coordinates of a discovery must be stored with sufficient precision to distinguish two positions approximately **10 meters apart**.

The system must also be able to determine whether a discovery is located within the defined radius around a point of interest.

### NFR-15 - Association With a Single Context

**Priority: MUST**

Each discovery must be associated with **one single context** when it is saved:

* the user's personal map;

* or a group map.

A discovery must never be automatically saved in multiple contexts simultaneously.

### NFR-16 - Data Persistence

**Priority: MUST**

After a discovery has been successfully saved, it must remain available after the application is closed and reopened.

### NFR-17 - Data Consistency

**Priority: MUST**

A saved discovery must always contain all mandatory information:

* photo;

* location;

* date;

* title;

* category;

* author.

No incomplete discovery must be retained.

---

## 6. Security

### NFR-18 - Authentication

**Priority: MUST**

All features requiring a user account must be inaccessible to unauthenticated users.

During a test without authentication, no private data must be accessible.

### NFR-19 - Group Authorization

**Priority: MUST**

A user must only be able to access groups they belong to.

When attempting to access another group:

* no group data must be displayed;

* no modification must be possible.

### NFR-20 - Discovery Modification

**Priority: SHOULD**

A user should not be able to modify or delete a discovery belonging to another user unless an explicit functional rule allows it.

An unauthorized attempt must not result in any data modification.

### NFR-21 - File Validation

**Priority: MUST**

Uploaded files must be validated before being saved.

Only the following formats must be accepted:

* JPEG/JPG;

* PNG;

* WebP.

The maximum allowed size is **10 MB per image**.

Any file exceeding this size or using an unsupported format must be rejected with an explicit error message.

### NFR-22 - Secret Management

**Priority: MUST**

No password, token, API key, or other secret used by the application must be stored in plain text in the Git repository.

### NFR-23 - Secure Communications

**Priority: MUST**

In the production environment, all communications containing private data or authentication information must use **HTTPS**.

None of this data must be transmitted over an unencrypted HTTP connection.

---

## 7. Data Protection and Privacy

### NFR-24 - Visibility of Personal Discoveries

**Priority: MUST**

A discovery saved on a user's personal map must not be accessible to any other user by default.

A second user must not be able to display or retrieve this discovery.

### NFR-25 - Isolation Between Groups

**Priority: MUST**

A discovery must only appear on a group map if it was saved in that group.

No personal discovery must be automatically added to or displayed in a group.

### NFR-26 - Point of Interest Isolation

**Priority: MUST**

The discovery of a point of interest must be specific to the context in which it occurred.

A point of interest discovered in a group must not automatically be considered discovered:

* on a member's personal map;

* on another group's map.

### NFR-27 - Image Metadata

**Priority: SHOULD**

Image metadata that is not required for the operation of the application should not be accessible to other users after the discovery has been saved.

---

## 8. Maintainability

### NFR-28 - Version Control

**Priority: MUST**

The entire project source code must be versioned using Git.

Any modification integrated into the main branch must be associated with an identifiable commit.

### NFR-29 - Documentation

**Priority: MUST**

The repository must contain documentation allowing a new developer to:

* install the project;

* install the dependencies;

* configure the required settings;

* run the application;

* understand the general organization of the project.

These five elements must be included in the delivered documentation.

### NFR-30 - Continuous Integration

**Priority: MUST**

Each Pull Request targeting the main branch must automatically trigger a verification pipeline.

The pipeline must at least verify:

* that the project can be built;

* that automated tests pass;

* that the quality checks defined by the project pass.

A Pull Request whose pipeline fails must not be considered ready for integration.

### NFR-31 - Automated Tests

**Priority: SHOULD**

Automated tests should cover at least the following critical behaviors:

* authentication;

* discovery creation;

* access to a group;

* rejection of unauthorized access to a group;

* association of a discovery with the active context;

* active context switching.

---

## 9. Reliability and Consistency

### NFR-32 - Photo and Discovery Consistency

**Priority: MUST**

No saved discovery must reference a non-existent photo.

If saving the photo fails, the corresponding discovery must not be created.

### NFR-33 - Missing Geolocation

**Priority: MUST**

The absence of GPS coordinates in a photo or the inability to automatically obtain a location must not prevent the user from adding a discovery.

In **100% of these cases**, the user must be able to manually select a position on the map.

### NFR-34 - Active Context Consistency

**Priority: MUST**

Only one context must be active at any given time.

After switching context:

* no discovery from the previous context must remain displayed;

* explored countries must correspond to the new context;

* discovered points of interest must correspond to the new context;

* any new discovery must be saved in the new context.

### NFR-35 - Progress Update

**Priority: SHOULD**

After a discovery has been successfully saved, the affected progress elements should be updated in less than **2 seconds**.

This includes in particular:

* explored countries;

* discovered points of interest;

* statistics associated with the context.

A failed creation must not cause any change in progress.

---

## 10. Accessibility

### NFR-36 - Readability

**Priority: SHOULD**

Normal-sized text should have a contrast ratio of at least **4.5:1** against its background.

Large text and essential graphical elements should have a contrast ratio of at least **3:1**.

### NFR-37 - Active Map Identification

**Priority: MUST**

The currently active context must be clearly identifiable:

* in the group list;

* on the Map screen.

Its identification must not rely solely on a difference in color.

The name of the active context must be displayed as text on the Map.

### NFR-38 - Interactive Elements

**Priority: SHOULD**

All buttons and icons corresponding to the main MVP actions should have a visible label or an accessible name that identifies their function.

---

## 11. Project Constraints

### NFR-39 - Controlled Scope

**Priority: MUST**

No feature defined as outside the MVP scope must be required for the operation of a mandatory MVP feature.

The MVP must be installable, usable, and demonstrable without implementing features considered as extensions.

### NFR-40 - Extensibility

**Priority: SHOULD**

Future additions of features identified as extensions should not require a complete rewrite of the application.

This includes in particular:

* more precise geographic exploration;

* adding new points of interest;

* additional statistics;

* recommendations;

* challenges or badges;

* additional social features.
