# ADR-005 - Country Detection

## Status

Accepted

## Context

Each Sterna discovery contains geographical coordinates.

When a discovery is created or its location is updated, the application must determine the country associated with the latitude and longitude.

For the delivered application, country detection must:

- work without relying on an external network request for every discovery;
- respect country borders;
- remain simple to implement and maintain;
- integrate with the existing Node.js backend;
- use geographical data persisted with the application's data.

## Decision

Country detection will be orchestrated by the **Node.js backend** using **PostgreSQL + PostGIS**.

The bundled `api/src/countries/countries.geo.json` boundary dataset is imported
into a PostGIS `countries` table by a versioned TypeORM migration. The same
source is used to generate the frontend's country veil, preventing the visual
and server-side country models from drifting apart.

When a discovery is created or its position is modified, the backend validates
the position and asks PostGIS to resolve the country. It first favours an
`ST_Contains` match. If simplified coastlines leave the point just outside all
polygons, it selects the nearest country within 5 kilometres using
`ST_DWithin` on `geography` values. A point farther away, such as one in open
ocean, remains without a country.

Discovery points and country polygons are represented as PostGIS spatial data.
The detected ISO alpha-3 identifier is stored in the discovery's nullable
`country_code` column and recalculated when its location changes.

```text
Latitude / Longitude
        |
        v
   Node.js API
        |
        v
 PostgreSQL + PostGIS
        |
        +-- discovery point
        |
        v
  country polygons
        |
        v
 containment or 5 km fallback
        |
        v
  Detected country
```

### Rationale and trade-offs

PostGIS is appropriate because country detection is an operation on persisted geographical data and must respect country boundaries.

Keeping the operation in PostgreSQL + PostGIS avoids loading all country geometries into Node.js for each workflow and lets the database apply spatial functions and indexes where appropriate.

The Node.js backend remains responsible for validating the discovery, triggering the query, interpreting the result, and applying the corresponding business rules.

The main trade-offs are maintaining the bundled boundary dataset and accepting
the limited precision of simplified coastlines. The 5-kilometre fallback
handles that simplification but must remain narrow enough not to attribute
genuinely offshore discoveries incorrectly.

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
- spatial indexes support containment and distance queries;
- results remain available even if external geocoding services are unavailable.

### Negative

- a suitable country-boundary dataset must be imported and maintained;
- accuracy depends on the selected dataset and its version;
- spatial query and index design must be maintained as the data grows.

## Implementation status

The decision is fully implemented. The migration repairs polygon geometry,
normalises it to `MultiPolygon`, seeds the `countries` table, adds the
`country_code` foreign key, and backfills existing discoveries. Separate GiST
indexes support polygon containment and the `geography` distance fallback.

## Future evolution

This decision should be revisited if country detection or other spatial operations become significantly more complex or frequent.

Possible future work includes replacing the simplified bundled boundaries with
a more authoritative or detailed version and extending the same PostGIS
approach to regions, zones, or exploration grids.
