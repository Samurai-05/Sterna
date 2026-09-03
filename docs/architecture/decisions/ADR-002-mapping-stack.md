# ADR-002 - Mapping Stack

## Status

Accepted

## Context

The map is a core component of Sterna. The solution must support:

- displaying an interactive map;
- distinguishing between explored and unexplored areas;
- displaying discoveries and their photos;
- displaying POIs;
- displaying the user's location;
- extensive visual customization;
- future evolution toward exploration regions, cells, or grids.

The stack must clearly separate the rendering engine, basemap provider, and Sterna-specific data.

## Decision

| Responsibility | Technology |
|---|---|
| Map rendering engine | MapLibre GL JS |
| Basemap / vector tiles | OpenFreeMap |
| Basemap data | Primarily OpenStreetMap |
| Map styling | Custom MapLibre Style JSON |
| Geocoding | Nominatim via Sterna backend |
| Sterna geographical data and spatial processing | PostgreSQL + PostGIS via Sterna backend |

The roles are distinct:

- OpenStreetMap primarily provides the map data;
- OpenFreeMap provides the vector tiles and basemap;
- MapLibre GL JS displays the map in the frontend;
- the custom `style.json` file defines Sterna's visual appearance;
- Nominatim is used to search for places and perform geocoding;
- observations, POIs, explored areas, and other Sterna data remain managed by our own backend and database;
- PostgreSQL + PostGIS stores Sterna's geographical data and performs spatial queries, while the backend remains responsible for orchestration and business rules.

```text
OpenStreetMap data
        |
   OpenFreeMap
        |
   Vector tiles
        |
 MapLibre GL JS
        |
 Custom Sterna style
        |
 + Sterna layers
   - discoveries
   - POIs
   - explored areas
   - future exploration grid
```

## Alternatives considered

| Alternative | Advantages | Disadvantages |
|---|---|---|
| Mapbox | Integrated platform and numerous services | Dependency on a proprietary provider and pricing constraints |
| MapTiler | Integrated mapping services and available styles | Dependency on an external provider; customization and costs must be checked based on usage |
| Leaflet | Simple, lightweight, and widely known API | Primarily a raster/DOM engine; less suited to vector tiles and advanced map customization |

## Consequences

### Positive

- extensive customization of the map's appearance;
- separation between the engine, tile provider, and Sterna data;
- the option to change tile providers later;
- integration suited to Sterna's specific geographic layers.

### Negative

- several building blocks must be integrated and maintained;
- the public Nominatim instance has usage and capacity limitations;
- OpenFreeMap does not provide every mapping service, which must be supplemented by Sterna or other services.

## Future evolution

Possible future developments include:

- producing vector tiles for Sterna data;
- investigating PMTiles and a potential offline mode;
- representing progress with a more precise exploration grid.
