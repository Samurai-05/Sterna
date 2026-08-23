# ADR-005 - Country Detection

## Status

Accepted

## Context

Each Sterna discovery contains geographical coordinates.

When a discovery is created or its location is updated, the application must determine the country associated with the latitude and longitude.

Country detection must:

- respect country boundaries;
- be performed consistently for all clients;
- avoid relying on an external network request for every discovery;
- integrate with the selected PostgreSQL/PostGIS database;
- remain extensible for future spatial features.

## Decision

Country detection will be performed using **PostGIS**.

A country-boundary dataset, such as Natural Earth or another suitable GeoJSON source, is imported into PostgreSQL/PostGIS.

When a discovery is created or its position is updated:

1. the frontend sends the latitude and longitude to the Sterna backend;
2. the backend creates or submits the corresponding spatial point;
3. PostGIS performs a point-in-polygon query against the stored country boundaries;
4. the backend associates the detected country with the discovery.

PostGIS functions such as `ST_Contains` or `ST_Covers` are used as appropriate for the selected boundary dataset and expected border behavior.

```text
Latitude / Longitude
        |
        v
   Sterna Backend
        |
        v
 PostgreSQL + PostGIS
        |
        +-- Discovery point
        |
        +-- Country boundaries
        |
        +-- Point-in-polygon query
        |
        v
  Detected country
```

The country identifier may be stored with the discovery as derived metadata to avoid repeating the same lookup unnecessarily.

### Rationale and trade-offs

Country detection is a spatial database operation and fits naturally with PostGIS.

Keeping country boundaries in the database avoids a network dependency on an external reverse-geocoding service and centralizes geographical logic in one place.

PostGIS provides tested spatial functions and spatial indexing, which is more robust and extensible than maintaining point-in-polygon logic directly in Node.js.

The trade-off is that country-boundary data must be imported and maintained in the database and the team must handle spatial types correctly.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| Static GeoJSON + `turf.js` in the backend | No PostGIS dependency; simple JavaScript integration | Geometry logic and dataset loading remain in application code; weaker foundation for additional spatial queries |
| External reverse-geocoding service | Minimal local geographical data | Network dependency, latency, usage limits and possible service unavailability |
| Nominatim reverse geocoding | Uses OpenStreetMap data and can return country information | Public service usage limitations and unnecessary external dependency for a deterministic operation |
| Overpass API | Access to OpenStreetMap geographical data | More complex than required for country detection |
| Client-side detection | Reduces backend/database work | Requires geographical data on the client and makes validation harder to enforce consistently |

## Consequences

### Positive

- no external request is required for country detection;
- country detection uses native spatial database functions;
- country boundaries and spatial queries are centralized;
- spatial indexes can improve performance;
- the same approach can support future geographical features.

### Negative

- country-boundary data must be imported and updated when necessary;
- PostGIS becomes required in all database environments;
- accuracy depends on the selected boundary dataset;
- exact points located on disputed or shared boundaries may require a defined application rule.

## Future evolution

The same PostGIS foundation may later support:

- proximity detection for POIs;
- explored-area calculations;
- spatial statistics;
- region intersections;
- more detailed administrative-area detection.

