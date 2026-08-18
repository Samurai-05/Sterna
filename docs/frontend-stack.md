# Sterna — Frontend stack

| Component | Technology | Status |
|---|---|---|
| Language | TypeScript | Validated |
| UI framework | React | Validated |
| Build tool | Vite | Validated |
| Web platform | PWA | Validated |
| Mobile runtime | Capacitor | Validated |
| Map engine | MapLibre GL JS | Validated |
| Basemap / vector tiles | OpenFreeMap | Validated |
| Map style | Custom MapLibre Style JSON | Validated |
| Geocoding | Nominatim via backend | Validated |
| Routing | TBD | To decide |
| Data fetching / server state | TBD | To decide |

## Overall frontend architecture

A React/TypeScript application is built with Vite. It is deployed as a PWA and run in a mobile application through Capacitor when the target is Android or iOS.

## Mapping

MapLibre GL JS displays OpenFreeMap vector tiles using a custom MapLibre JSON style. Geocoding is handled through the backend via Nominatim.

## Open decisions

The routing engine and the data fetching / server state solution still need to be selected.
