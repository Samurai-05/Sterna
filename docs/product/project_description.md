# Project Description

## 1. Problem Statement

During trips and outings, people take many photos, but those photos usually
remain in a conventional gallery with little connection to the places where
they were taken. As the collection grows, memories become difficult to find,
contextualize, and relate to the journey as a whole.

The problem becomes more visible when several people travel together. Their
photos are spread across different devices, making it difficult to reconstruct
a shared record of the experience or visualize what the group explored.

Sterna addresses both situations. It connects photos to locations and presents
them as discoveries on an interactive map. It also provides shared group maps,
allowing several users to build a common travel history while every discovery
retains its author.

## 2. Delivered Solution

Sterna is a mobile-first application for recording, organizing, and sharing
geolocated discoveries. It is available as an installable web application and
as an Android application built from the same React and TypeScript frontend
through Capacitor.

A user can import a photo from their device or, on Android, take a new photo
through Sterna's native capture screen. The application extracts the date and GPS
coordinates from the photo when they are available. The user can keep that
position, use their current location, search for a place, or choose a position
manually on the map before saving.

Each photo becomes a discovery containing its location and contextual
information. Discoveries can be stored on the user's personal map or shared with
one or more groups. The corresponding countries and nearby
points of interest are then reflected in the exploration progress of each
destination map.

Sterna therefore combines a photo collection, a geographical exploration tool,
and a collaborative travel journal in one application.

Its interface is organized around five main sections: **Map** displays the
active exploration map, **Gallery** brings together accessible discoveries and
points of interest, **Add** creates a new discovery, **Groups** manages shared
maps and their members, and **Me** summarizes the personal exploration of the
currently signed-in user and provides access to account settings.

## 3. Project Objectives

The project aims to:

- reconnect travel photos with their geographical and personal context;
- provide a clear visual representation of individual and shared exploration;
- allow groups to build a collaborative record of their trips and activities;
- make recorded memories easy to organize, find, and revisit;
- encourage users to explore new countries and places;
- deliver a consistent mobile-first experience across the web and Android.

## 4. Main Concepts

### Discoveries

A **discovery** is a geolocated observation recorded by a user. It contains:

- a photo;
- a title;
- a geographical position;
- a date;
- a category;
- an author;
- an optional description;
- one or more destination maps.

The author can edit the title, description, category, location, and destination
maps of a discovery, or delete it. A discovery shared with a group remains
attributed to its author.

### Categories

Discoveries use seven predefined categories:

- Landscape;
- Monument;
- Food;
- Animal;
- Plant;
- Culture;
- Other.

The categories are deliberately broad and quick to select. If the user does not
choose one, **Other** is assigned automatically.

### Personal and Group Maps

Every user has a personal map. A group provides a separate shared map to which
all its members can contribute.

A discovery can belong to the personal map, to one or more group maps, or to
both. Access to group discoveries is restricted to members of the corresponding
group.

### Active Map

Only one map context is active at a time: the personal map or one of the user's
groups. The active map determines which discoveries, explored countries, and
discovered points of interest are displayed on the main map.

It also provides the default destination when a discovery is created. The user
can still change the selection and save the discovery to several maps before
confirming it.

## 5. Map and Geographic Exploration

The interactive map is Sterna's main screen. At the global scale it is rendered
as a globe. Countries that contain at least one discovery in the active map are
revealed, while unexplored countries remain covered by a neutral veil.

At closer zoom levels, discoveries appear as category markers. Their photo
previews become visible when the user approaches their location, and selecting
a discovery opens its photo and contextual details.

The map also allows the user to:

- switch between the personal map and group maps;
- filter discoveries by category;
- display or hide points of interest through the filters;
- recenter on the device's current location;
- reset the map orientation;
- search for countries, regions, cities, villages, places, discoveries, and
  points of interest;
- return directly to the map location of a discovery opened from the gallery.

If the device location is unavailable when the map first opens, the application
shows the complete globe instead of reusing an unrelated previous position.

One discovery is sufficient for a country to be considered explored. A more
detailed region-based exploration model remains a possible future
evolution.

## 6. Discovery Creation and Location

The creation flow supports both browser and Android use. On the web, the user
selects a JPEG, PNG, or WebP image from the device. On Android, the native flow
allows the user to take a photo or choose one from the gallery.

Once the photo is selected, Sterna proposes the most relevant available
location:

1. GPS coordinates embedded in the photo are used when available.
2. The current device location can be used when appropriate.
3. The user can search for a place and select a result.
4. The marker can always be positioned or corrected manually on the map.

A location explicitly chosen through search or manual placement is preserved
and is not later overwritten by an automatic suggestion. The user then enters
the title, optional description, category, and destination maps before saving.

## 7. Gallery and Discovery Consultation

The **Gallery** provides a visual collection in addition to the map. It
contains the user's accessible discoveries and points of interest.

The gallery supports:

- a compact photo grid and a detailed card view;
- text search;
- category and POI filters;
- filtering by personal map, a specific group, or all groups;
- consultation of discoveries created by other members of accessible groups;
- an immersive full-screen photo viewer;
- navigation between the discoveries in the current gallery selection;
- opening the current discovery at its location on the appropriate map.

The detail view displays the title, photo, author, date, category, map context,
location, and description. Only the author is allowed to edit or delete the
discovery.

## 8. Points of Interest and Gamification

Sterna includes a catalogue of **921 predefined points of interest** covering
the 193 United Nations member states, Palestine, and Vatican City. Each covered
country has at least one iconic place, with up to five for countries where the
source data provides enough suitable places.

Points of interest act as exploration targets. They are available from the map,
search, and gallery. Their images are greyed out before discovery and shown in
colour afterwards.

A point of interest is considered discovered when a discovery in the same map
is recorded within 150 metres of it. This status is calculated independently
for each personal or group map, so progress from one context does not leak into
another.

The profile provides a personal overview of the exploration completed by the
currently signed-in user. It is based on that user's own discoveries and is
independent of discoveries contributed by other group members. It includes:

- points of interest discovered and overall POI progress;
- countries visited;
- discoveries by category;
- discovery activity over the previous six months;
- recent discoveries.

Badges, challenges, recommendations, and rankings have not been implemented and
remain possible future extensions.

## 9. Group Management

Authenticated users can:

- create a group with a name and optional description;
- edit a group they own;
- invite other users with an invitation code or QR code;
- join a group by entering its code;
- scan a group invitation QR code from the Android application;
- view the members and recent discoveries of a group;
- activate a group map;
- share a discovery with one or more groups;
- view discoveries contributed by other members;
- leave a group;
- delete a group they own.

When a membership or group is removed, the application also updates the active
map and cached group data so that inaccessible content is no longer displayed.
Comments, likes, notifications, and other social-network features are not part
of the delivered application.

## 10. Accounts and Profiles

Sterna provides account registration, login, logout, and authenticated access
to personal data. Authenticated data is isolated by user and group membership.
The **Me** section always represents the account and personal exploration of
the currently signed-in user.

From the profile and account settings, a user can:

- view their exploration statistics and recent discoveries;
- change their display name;
- add, replace, or remove a profile photo;
- change their password;
- delete their account after confirming their password.

Changing the password invalidates existing sessions. Deleting an account also
removes the data and stored photos owned by that account, while group ownership
is handled so that remaining members are not left with inaccessible data.

## 11. Future Extensions

Sterna's current version delivers the complete experience described above,
from geolocated photo creation to personal and collaborative exploration. The
following capabilities are intentionally not part of the delivered application
and represent possible directions for its continued development:

- exploration based on regions or geographical grid cells;
- personalized place recommendations;
- badges and advanced challenges;
- automatic recognition of photo content;
- comments, likes, notifications, or a public social feed;
- rankings between users or groups;
- complete offline use and offline synchronization;
- iOS packaging and distribution through mobile application stores.

They remain possible directions if Sterna is developed beyond the current
project deliverable.
