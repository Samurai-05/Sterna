# Project Description

## 1. Problem Statement

During trips or outings, users take many photos. However, these photos are usually stored in a standard gallery, without any real connection to the place where they were taken. Over time, these memories become difficult to find, contextualize, and connect with one another.

This loss of context is even more significant when a trip is made with several people. Photos are then scattered across the devices of the different participants, without a shared view of the experience. It becomes difficult to easily reconstruct an overall record of the trip or visualize the collective exploration.

This is precisely where the project stands out: the concept of a **collaborative group** is at the core of the experience. The application is not limited to individual use, but also provides a shared space in which several users build a living map of their discoveries together.

## 2. Proposed Solution

The project consists of developing a multiplatform frontend application that allows users to save, visualize, and share their discoveries on an interactive map.

Sterna uses a shared React/TypeScript frontend built with Vite. The application targets the web as an installable PWA and mobile platforms through Capacitor, which packages the same frontend and provides access to native capabilities when necessary.

The user can take a photo directly from the application or import a photo from their phone gallery. Each photo is associated with a geographical position and becomes an observation visible on the map.

The application therefore transforms photos into geolocated discoveries. Countries in which observations have been made are highlighted in order to progressively visualize the areas that have been explored.

The user has their own personal map, but can also create or join groups. Each group has a shared map containing the discoveries made by its members. This approach transforms a simple collection of photos into a contextualized, collaborative, and memorable experience.

A gamification aspect complements the application by progressively revealing iconic places and allowing users to track their exploration progress.

## 3. Objectives

The main objectives of the project are:

* allow a user to build a personal map of their discoveries;

* allow several users to build a shared map during a trip or shared activity;

* allow users to easily switch between their personal map and the maps of their different groups;

* allow photos to be added from the camera or gallery;

* automatically geolocate a photo when GPS coordinates are available;

* allow the user to manually select a location when geolocation is missing or incorrect;

* visualize already explored countries directly on the map;

* allow users to classify discoveries into simple categories;

* add a gamification aspect to encourage the exploration of new regions and new places.

## 4. Main Concepts

### Discoveries

A **discovery** corresponds to an observation recorded by a user.

A discovery contains at least:

* a photo;

* a location;

* a date;

* a title;

* a category;

* an author.

It may also contain:

* a description.

A discovery can belong to the user's personal map and/or to one or more groups selected when the discovery is added.

### Categories

Categories are used to classify discoveries in order to make them easier to visualize and search. They must be quick to select.

There are seven predefined categories:

* Landscape;

* Monument;

* Food;

* Animal;

* Plant;

* Culture;

* Other.

If the user does not select a category, the **Other** category is automatically assigned.

This allows the user to quickly save a photo without being required to complete several fields.

### Groups

A group represents a shared exploration space between several users.

Each group has:

* its own members;

* its own map;

* its own discoveries;

* its own exploration progress.

A discovery added to a group remains associated with its author so that users can see who added it.

### Active Map

A user can belong to several groups, but only one context is displayed on the map at a time.

The user can select:

* their personal map;

* one of their groups.

The selected context becomes the active map. It determines the discoveries, explored countries, and discovered places displayed on the map. When adding a new discovery, the active context is pre-selected as its destination, but the user can choose instead to save it to their personal map and/or one or more groups.

The active map can be changed directly from the map screen.

## 5. Map and Exploration

The map is the main screen of the application.

It can be viewed at different zoom levels.

At the global scale, the map is represented as a globe, allowing users to quickly visualize explored areas around the world.

Countries are displayed differently depending on their status:

* a country containing at least one discovery in the active context is considered explored and appears in color;

* a country containing no discovery appears greyed out.

For the MVP, a single discovery is therefore sufficient for the entire country to be considered explored.

When the user zooms in on the map, discoveries are represented by markers, allowing their locations to be viewed more precisely.

In the future, this representation could evolve towards a more precise system based on visited regions or a geographical grid divided into cells.

## 6. Points of Interest & Gamification

The application aims to encourage users to discover new places rather than simply accumulate photos.

A selection of **iconic points of interest** is defined in the application. These points may, for example, correspond to monuments or well-known places that users can discover.

Points of interest remain visible as exploration targets. Their images are greyed out before they are explored and displayed in colour after discovery.

When a discovery is recorded sufficiently close to a point of interest, that point of interest is considered explored.

The discovery status displayed for a point of interest always belongs to the active context.

The first version may notably display the following statistics in the user's profile:

* number of countries visited;

* number of points of interest explored;

* number of discoveries per category;

* overall exploration progress.

For the MVP, the catalogue covers each of the 193 UN member states, plus Palestine and Vatican City, with at least one well-known point of interest per country and up to five for the most-documented ones.

Challenges, badges, recommendations, advanced rankings, or region-specific collections are considered possible future extensions.

## 7. Group Management

A user can create or join a group in order to share a map with several people.

The group features planned for the MVP are:

* create a group;

* invite users via a link or code;

* join a group;

* display group members;

* select a group as the active group;

* change the active group from the map;

* add a discovery to one or more of the user's groups, in addition to or instead of the personal map;

* view discoveries added by other group members;

* view the group's own exploration progress;

* leave a group.

Social-network features such as comments, likes, or notifications are not part of the MVP.

## 8. Main User Flows

### Add a Discovery

1. The user opens the map.

2. They check or select the map(s) in which they want to add their discovery: their personal map and/or one or more groups, pre-selected from the active context.

3. They select **Add**.

4. They choose between:

   * taking a photo;

   * importing a photo from their gallery.

5. They choose a title for the discovery.

6. The application attempts to retrieve the GPS coordinates of the photo.

7. If coordinates are available, they are proposed to the user.

8. If they are missing or incorrect, the user manually selects the location on the map.

9. They may optionally choose a category and add a description.

10. They save the discovery.

11. The photo appears on the map of each selected context.

12. If the discovery results in the exploration of a new country or point of interest, the progress of each relevant context is updated.

### View a Discovery

1. The user opens the map.

2. They select their personal map or a group.

3. They navigate on the map to a discovery.

4. They select the marker.

5. The application displays the photo and the main information about the discovery, including its author and title.

### Change Group

The user can change context in two ways:

#### From the Map

1. They open the **Map** tab.

2. They select the currently active context.

3. They choose their personal map or one of their groups.

4. The map is immediately updated with the discoveries and progress of the newly active context.

#### From the Groups Screen

1. They open the **Groups** tab.

2. They select one of the groups they belong to.

3. They choose to activate it.

4. The group becomes the active context, and the main map then displays its discoveries and progress.

## 9. User Interface

A navigation bar grouping the application's main features allows the user to quickly access the different sections:

* Map;

* Collection;

* Add;

* Groups;

* Profile.

The map is the central interface of the application.

From this screen, the user can notably:

* identify the currently active context;

* change the active group;

* search for a location;

* filter discoveries by category;

* recenter the map on their current location;

* view discoveries;

* navigate between a global view and more detailed zoom levels;

* visualize explored countries.

## 10. MVP Scope

The MVP must primarily support:

* user authentication;

* adding and storing photos;

* retrieving or manually entering a location;

* displaying discoveries on a map;

* visualizing explored countries;

* filtering by categories;

* personal map;

* creating and using group maps;

* membership in multiple groups;

* selecting and changing the active group;

* displaying discoveries and progress specific to the active context;

* discovering a limited selection of points of interest;

* simple exploration statistics.

## 11. Out of MVP Scope

The following elements are intentionally excluded from the first version:

* more detailed map exploration based on regions or geographical cells;

* personalized recommendations;

* advanced challenges;

* detailed automatic recognition of photo content;

* public social network;

* comments and likes;

* advanced rankings between users or groups;

* full offline functionality;

* a separately developed native mobile application in Kotlin or Swift, distributed through app stores; the Capacitor-based mobile target remains part of the selected architecture.
