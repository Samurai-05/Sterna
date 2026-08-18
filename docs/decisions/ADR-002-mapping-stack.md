# ADR-002 — Mapping Stack

## Status

Accepted

## Context

La carte est un composant central de Sterna. La solution doit permettre :

- l'affichage d'une carte interactive ;
- la distinction entre zones explorées et non explorées ;
- l'affichage d'observations et de photos ;
- l'affichage de POI ;
- l'affichage de la position de l'utilisateur ;
- une personnalisation visuelle importante ;
- une évolution vers des régions, cellules ou grilles d'exploration.

La stack doit séparer clairement le moteur de rendu, le fournisseur de fond cartographique et les données propres à Sterna.

## Decision

| Responsibility | Technology |
|---|---|
| Map rendering engine | MapLibre GL JS |
| Basemap / vector tiles | OpenFreeMap |
| Basemap data | Primarily OpenStreetMap |
| Map styling | Custom MapLibre Style JSON |
| Geocoding | Nominatim via Sterna backend |
| Sterna geographical data | Sterna backend / database |

Les rôles sont distincts :

- OpenStreetMap fournit principalement les données cartographiques ;
- OpenFreeMap fournit les vector tiles et le basemap ;
- MapLibre GL JS affiche la carte dans le frontend ;
- le fichier `style.json` personnalisé définit l'apparence visuelle de Sterna ;
- Nominatim sert à rechercher des lieux et à faire du geocoding ;
- les observations, POI, zones explorées et autres données Sterna restent gérés par notre propre backend et notre base de données.

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
   - visits
   - POIs
   - explored areas
   - future exploration grid
```

## Alternatives considered

| Alternative | Avantages | Inconvénients |
|---|---|---|
| Mapbox | Plateforme intégrée et nombreux services | Dépendance à un fournisseur propriétaire et contraintes de tarification |
| MapTiler | Services cartographiques intégrés et styles disponibles | Dépendance à un fournisseur externe ; personnalisation et coûts à vérifier selon l'usage |
| Leaflet | API simple, légère et largement connue | Moteur principalement raster/DOM ; moins adapté aux vector tiles et à une personnalisation cartographique avancée |

## Consequences

### Positives

- forte personnalisation de l'apparence de la carte ;
- séparation entre moteur, fournisseur de tiles et données Sterna ;
- possibilité de changer de fournisseur de tiles plus tard ;
- intégration adaptée aux layers géographiques spécifiques de Sterna.

### Négatives

- plusieurs briques doivent être intégrées et maintenues ;
- l'instance publique de Nominatim a des limitations d'usage et de capacité ;
- OpenFreeMap ne fournit pas tous les services cartographiques, qui restent à compléter côté Sterna ou via d'autres services.

## Future evolution

Les évolutions possibles sont :

- utiliser PostGIS pour les requêtes et traitements géographiques ;
- produire des vector tiles propres aux données Sterna ;
- étudier PMTiles et un mode offline éventuel ;
- représenter la progression avec une grille d'exploration plus précise.

