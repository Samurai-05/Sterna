# ADR-005 - Country Detection

## Status

Accepted

## Context

Each Sterna discovery contains geographical coordinates.

When a discovery is created or its location is updated, the application must determine the country associated with the latitude and longitude.

For the MVP, country detection must:

- work without relying on an external network request for every discovery;
- respect country borders;
- remain simple to implement and maintain;
- integrate with the existing Node.js backend;
- use geographical data persisted with the application's data.

## Decision

Country detection will be orchestrated by the **Node.js backend** using **PostgreSQL + PostGIS**.

The country-boundary dataset must be imported into or otherwise made available to PostGIS. The source and version of this dataset have not yet been selected and are intentionally not specified by this ADR.

When a discovery is created or its position is modified, the backend validates the position and requests a spatial containment operation from PostGIS. Conceptually, this may use operations such as `ST_Contains`, `ST_Within`, or `ST_Intersects`, without fixing the exact SQL query or schema.

The observation point and country polygons are represented as PostGIS spatial data. The detected country identifier may then be stored as derived metadata associated with the discovery.

```text
Latitude / Longitude
        |
        v
   Node.js API
        |
        v
 PostgreSQL + PostGIS
        |
        +-- observation point
        |
        v
  country polygons
        |
        v
 spatial containment query
        |
        v
  Detected country
```

### Rationale and trade-offs

PostGIS is appropriate because country detection is an operation on persisted geographical data and must respect country boundaries.

Keeping the operation in PostgreSQL + PostGIS avoids loading all country geometries into Node.js for each workflow and lets the database apply spatial functions and indexes where appropriate.

The Node.js backend remains responsible for validating the discovery, triggering the query, interpreting the result, and applying the corresponding business rules.

The main trade-offs are the need to import and maintain a suitable country-boundary dataset and to design the spatial query and indexes appropriately. The dataset source and version remain open decisions.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| GeoJSON + Turf.js in Node.js | Simple application-side implementation for a small MVP dataset | Duplicates spatial capabilities already provided by PostGIS and consumes backend memory and CPU for persisted-data operations |
| External reverse-geocoding service | Simple application-side implementation | Network dependency, usage limits, latency and possible service unavailability |
| Nominatim reverse geocoding | Uses OpenStreetMap data and can return country information | Public service usage limitations and unnecessary network dependency for this operation |
| Overpass API | Access to OpenStreetMap geographical data | More complex than required for simple country detection |
| Client-side detection | Reduces backend processing | Requires sending geographical data to the client and makes consistent validation harder |

## Consequences

### Positive

- no external request is required for country detection;
- country borders are evaluated by PostGIS spatial queries;
- the logic remains centralized in the backend;
- spatial indexes can be used when necessary;
- results remain available even if external geocoding services are unavailable.

### Negative

- a suitable country-boundary dataset must be imported and maintained;
- accuracy depends on the selected dataset and its version;
- spatial query and index design must be maintained as the data grows.

## Future evolution

This decision should be revisited if country detection or other spatial operations become significantly more complex or frequent.

Possible future work includes selecting and versioning an authoritative geographical source, refining spatial indexes, and extending the same PostGIS approach to regions, zones, or exploration grids.
