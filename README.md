<div align="center">
  <img src="C:\Users\abram\HEIG\PDG\Sterna\landing\src\assets\brand\sterna-logo-green-filled.svg" alt="Sterna logo" width="96" />
  <h1>Sterna</h1>
  <p>A mobile-first application for turning geolocated photos into a personal and shared map of discoveries.</p>
  <p><a href="https://www.sterna-app.ch/">Website</a></p>
</div>

<div align="center">
  <a href="https://www.sterna-app.ch/">
    <img src="C:\Users\abram\HEIG\PDG\Sterna\landing\design-assets\source\mockups\optimized\weekend-paris-720.webp" alt="Sterna discovery location screen" width="360" />
  </a>
</div>

## About

Travel photos usually remain in a gallery, where the geographic story of a trip is difficult to see and revisit. This is even more fragmented when several people travel together and their memories stay on separate devices.

Sterna turns photos into geolocated discoveries. Discoveries appear on a map and progressively build a visual representation of the countries explored. They can also be shared through groups, so several users can contribute to a common map while each discovery keeps its author.

## Core features

The MVP is built around four closely related concepts:

### Discover countries

A country containing at least one discovery in the active map is considered visited in the MVP. Adding discoveries therefore builds a progressively visual representation of the countries explored.

### Geolocated discoveries

A photo becomes a discovery with a geographic position. Sterna attempts to use GPS coordinates available in the photo metadata. If they are missing or incorrect, the user can choose or correct the position manually on the map.

### Personal exploration map

The user's discoveries appear on a personal interactive map. The map is the central interface for viewing discoveries and the countries visited in the active context.

### Shared group maps

Users can create or join groups. Each group has a shared map containing the discoveries that its members associate with it. Every discovery retains its author so that contributions remain identifiable.

The MVP also defines simple discovery categories, including Landscape, Monument, Food, Animal, Plant, Culture, and Other. Badges, challenges, recommendations, advanced statistics, and more detailed region or cell-based exploration are not presented as the core of this project.

## Tech Stack

The following choices are supported by the accepted architecture decisions, the current landing page configuration, or the repository's deployment configuration.

- **Application frontend:** a shared React/TypeScript application built with Vite, targeting the web as a PWA with `vite-plugin-pwa` and mobile platforms through Capacitor, along with React Router, TanStack Query, and the native Fetch API.
- **Backend and data:** Node.js/TypeScript API, PostgreSQL + PostGIS for relational and spatial data, and MinIO for photo object storage.
- **Mapping:** MapLibre GL JS, OpenFreeMap vector tiles, primarily OpenStreetMap data, a custom MapLibre Style JSON, and Nominatim accessed through the Sterna backend.
- **Landing page:** Next.js, React, TypeScript, and Tailwind CSS.
- **Container and deployment configuration:** Docker Compose and Nginx.

## Getting started

### Landing page

The landing page can be run locally from its own directory:

```bash
cd landing
npm install
npm run dev
```

It is served at [http://localhost:3000](http://localhost:3000). To create and serve a production build, use the scripts provided by `landing/package.json`:

```bash
npm run build
npm run start
```

### Docker Compose

The root Compose configuration currently builds the Nginx deployment placeholder. The default port is `8080` and can be changed through `WEB_PORT`:

```bash
cp .env.example .env
docker compose up --build
```

The placeholder is available at [http://localhost:8080](http://localhost:8080) with the default configuration.

The application frontend does not currently have a tracked `package.json` or source tree in this checkout, so no separate application run command is documented here.

## Documentation

- [Project description](docs/project_description.md)
- [Functional requirements](docs/functional_requirements.md)
- [Non-functional requirements](docs/non_functional_requirements.md)
- [Frontend stack](docs/frontend-stack.md)
- [ADR-001 — Frontend platform](docs/decisions/ADR-001-frontend-platform.md)
- [ADR-002 — Mapping stack](docs/decisions/ADR-002-mapping-stack.md)
- [Contributing guide](docs/CONTRIBUTING.md)
- [Work process](docs/work_process.md)

## Team

Sterna is developed by four students at HEIG-VD.

- [**Victor Giordani**](https://github.com/VictorGTheCoder) — Data Science
- [**Abram Zweifel**](https://github.com/Abram0303) — Data Science
- [**Romain Durussel**](https://github.com/romain-drsl) — Data Science
- [**Samuel Dos Santos**](https://github.com/Samurai-05) — Networks

Sterna is developed in the context of **HEIG-VD PDG 2026**.
