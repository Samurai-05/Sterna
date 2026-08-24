# Architecture

This document describes how the pieces of Sterna fit together: the client, the
backend services, and how they talk to each other. It reflects what is decided
as of Sprint 0; open points are listed at the end instead of being glossed over.

## Overview

Sterna is a map-centric PWA. The client renders a map, unlocks regions as the
user visits them, and lets the user record visits with photos. The backend is a
single API service backed by PostgreSQL/PostGIS for data and spatial queries,
and MinIO for photo storage. Everything server-side runs as containers on one
VM behind an Nginx reverse proxy, orchestrated with Docker Compose. This
matches the `docker compose up` workflow described in `docs/CONTRIBUTING.md`
and keeps Sprint 0 infrastructure work to a single deployable unit.

## Component diagram

![alt text](markdown-images/image.png)

Source: [`architecture.puml`](architecture.puml).

- **PWA**: runs in the browser, registers a
  service worker for offline support.
- **Service worker / IndexedDB**: caches the app shell and the regions the
  user has already visited, so the map stays usable offline.
- **Nginx**: single entry point on the Application VM. Terminates TLS, serves
  the static app bundle, and routes API/photo requests to the right container.
- **API service** (Node.js): the only component that talks to the database
  and to object storage; the client never accesses them directly.
- **PostgreSQL + PostGIS**: stores application data (users, visits, groups,
  progression) and answers spatial queries such as "is this GPS point inside
  this region" when a visit is recorded.
- **MinIO**: S3-compatible object storage for visit photos, self-hosted
  alongside the rest of the stack so we don't depend on a third-party bucket
  during development or grading.
- **Basemap tile provider**: external source of map tiles, loaded directly by
  the client (not proxied through our API).

## Data flow

1. The PWA loads over HTTPS through Nginx, which serves the static bundle.
2. For data, the PWA calls the API over HTTPS through the same Nginx entry
   point; Nginx routes `/api/*`-style requests to the API service container.
3. The API is the only component with credentials to PostgreSQL and MinIO:
   - Reads/writes application data and runs spatial queries (e.g. point-in-polygon
     to decide whether a recorded visit unlocks a region) against
     PostgreSQL/PostGIS.
   - Stores and retrieves photos in MinIO through its S3-compatible API, and
     returns URLs/proxies the bytes back to the client as needed.
4. Basemap tiles are fetched by the client directly from the tile provider;
   they do not go through our API, since they aren't user data.
5. The service worker caches the app shell and previously-loaded visited
   regions in IndexedDB, so the map and past visits remain viewable offline.
   Only new visits/photos require connectivity.

## Key choices and why

- **Single VM + Docker Compose, not a multi-node/orchestrated setup.** The
  project runs for three weeks with a four-person team; a Kubernetes-style
  setup would add operational overhead with no benefit at this scale. A single
  VM with Compose is what `docs/CONTRIBUTING.md` already assumes for local
  development, so the deployed environment mirrors dev.
- **PostgreSQL + PostGIS for the database.** The core interaction of the app,
  "did this visit fall inside this region", is a spatial query. PostGIS gives
  us that natively (point-in-polygon, distance queries) instead of us
  reimplementing geometry checks in application code.
- **MinIO for photo storage, not the filesystem or a third-party bucket.**
  Photos are large, user-generated files and don't belong in the relational
  database. MinIO exposes the S3 API, so the API service is written against a
  standard interface and could be pointed at a managed S3-compatible bucket
  later without a rewrite, while staying self-hosted and free for development
  and the grading environment.
- **Nginx as the single reverse proxy / TLS termination point.** It is the
  only container exposed to the outside network; the API, database and MinIO
  are only reachable from inside the Compose network. That limits the attack
  surface and puts TLS certificate handling in one place.
- **The API is the sole gateway to PostgreSQL and MinIO.** The client never
  holds database or MinIO credentials. Authorization logic (e.g. "can this
  user see this group's photos") lives in one place instead of being
  duplicated or bypassed on the client.
- **PWA with an offline-capable service worker.** The map/visit-recording use
  case happens outdoors, where connectivity is unreliable. Caching the app
  shell and already-visited regions keeps the app usable without a network
  connection, and it works without an app-store install.

## Open decisions

These will be resolved during Sprint 0/1 as the corresponding area owner (see
`docs/work_process.md`) makes the call:

- **Frontend framework** for the PWA (React, SvelteKit, Vue, or other).
- **Node.js API framework** (Express, Fastify, or NestJS).
- **Basemap tile provider** (e.g. a hosted OSM-based provider vs. self-hosting
  tiles).

CI/CD (pipeline, container registry, deployment automation) is out of scope
for this document; it belongs to the separate CI/CD pipeline work tracked for
Sprint 0.
