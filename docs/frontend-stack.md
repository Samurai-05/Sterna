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

## Architecture frontend globale

Une application React/TypeScript est buildée par Vite. Elle est déployée comme PWA et exécutée dans une application mobile via Capacitor lorsque la cible est Android ou iOS.

## Cartographie

MapLibre GL JS affiche les fonds vectoriels OpenFreeMap à partir d'un style MapLibre JSON personnalisé. Le géocodage passe par le backend via Nominatim.

## Décisions encore ouvertes

Le moteur de routing et la solution de fetching / server state restent à choisir.
