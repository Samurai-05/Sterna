# Sterna — Frontend stack

| Component | Technology | Status |
|---|---|---|
| Language | TypeScript | OK |
| UI framework | React | OK |
| Build tool | Vite | OK |
| Web target | PWA | OK |
| PWA integration | vite-plugin-pwa | OK |
| Mobile runtime | Capacitor | OK |
| App routing | React Router | OK |
| HTTP client | Fetch API | OK |
| Data fetching / server state | TanStack Query | OK |
| Map engine | MapLibre GL JS | OK |
| Basemap / vector tiles | OpenFreeMap | OK |
| Map style | Custom MapLibre Style JSON | OK |
| Geocoding | Nominatim via backend | OK |

## Overall frontend architecture

A React/TypeScript single-page application is built with Vite.

The shared application targets the web as a Progressive Web App (PWA). The PWA manifest and service worker are managed using `vite-plugin-pwa`.

For mobile targets, the same application is packaged and executed through Capacitor. Native device capabilities can be accessed through Capacitor plugins when necessary.

```text
                         Sterna frontend
                  React / TypeScript / Vite
                           /          \
                          /            \
                       PWA          Capacitor
                       Web            Mobile
                          \            /
                           \          /
                            HTTPS API
```

React Router handles client-side navigation between the main application screens.

TanStack Query manages server state, including API queries, mutations, caching and cache invalidation. HTTP requests are performed using the native Fetch API.

## Mapping

MapLibre GL JS renders the interactive map using vector tiles provided by OpenFreeMap.

The visual appearance of the map is controlled through a custom MapLibre Style JSON.

Geocoding requests are sent from the frontend to the backend. The backend queries Nominatim and returns the relevant location data to the frontend. The frontend therefore never communicates directly with Nominatim.
