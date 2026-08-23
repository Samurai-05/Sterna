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
- avoid introducing unnecessary database complexity.

## Decision

Country detection will be performed in the **Node.js backend** using:

- a static GeoJSON dataset containing country boundaries;
- `turf.js`, in particular `@turf/boolean-point-in-polygon`, for point-in-polygon calculations.

The GeoJSON dataset is loaded by the backend.

When a discovery is created or its position is modified, the backend checks which country polygon contains the geographical point.

The detected country identifier may then be stored in PostgreSQL as derived metadata associated with the discovery.

```text
Latitude / Longitude
        |
        v
   Sterna Backend
        |
        +-- Country boundaries (GeoJSON)
        |
        +-- turf.js
        |
        v
  Detected country
        |
        v
    PostgreSQL
```

### Rationale and trade-offs

Country detection is a relatively simple spatial operation and does not require a full spatial database extension for the MVP.

Using a local GeoJSON dataset provides deterministic results and avoids depending on an external service during discovery creation.

`turf.js` provides established geometry operations in JavaScript and integrates directly with the Node.js backend.

The main trade-off is that the backend must load and process the country boundary dataset itself. This approach may become less suitable if Sterna later requires more advanced or high-volume spatial processing.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| PostgreSQL + PostGIS | Native point-in-polygon queries and spatial indexing | Adds database complexity that is unnecessary for the current MVP |
| External reverse-geocoding service | Simple application-side implementation | Network dependency, usage limits, latency and possible service unavailability |
| Nominatim reverse geocoding | Uses OpenStreetMap data and can return country information | Public service usage limitations and unnecessary network dependency for this operation |
| Overpass API | Access to OpenStreetMap geographical data | More complex than required for simple country detection |
| Client-side detection | Reduces backend processing | Requires sending geographical data to the client and makes consistent validation harder |

## Consequences

### Positive

- no external request is required for country detection;
- country borders are evaluated directly from polygon data;
- the logic remains centralized in the backend;
- no PostGIS dependency is required;
- results remain available even if external geocoding services are unavailable.

### Negative

- the GeoJSON dataset must be bundled and maintained;
- geometry calculations consume backend resources;
- accuracy depends on the selected country boundary dataset;
- the approach is not optimized for large-scale spatial processing.

## Future evolution

This decision should be revisited if country detection or other spatial operations become significantly more complex or frequent.

Possible future alternatives include:

- introducing PostGIS;
- using spatial indexes;
- replacing the static dataset with another authoritative geographical source;
- using a dedicated geospatial service where appropriate.
