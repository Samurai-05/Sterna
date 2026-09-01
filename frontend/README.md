# Sterna frontend

React, TypeScript and Vite application for Sterna: authentication, map,
discoveries, groups and profile. It relies on React Router, TanStack
Query, Tailwind CSS v4, shadcn/ui, Capacitor Android, MapLibre GL JS, a PWA
and quality tooling.

## Prerequisites

- Node.js 22 or newer
- npm
- JDK 21 and Android SDK (API 36) to produce the Android APK
- Android Studio, only to open the Android project (optional for the build)

## Commands

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Run the tests:

```bash
npm run test
```

Lint the code and apply formatting:

```bash
npm run lint
npm run format
```

Produce the web/PWA build:

```bash
npm run build
```

This build leaves `VITE_API_BASE_URL` empty. `/api/...` calls therefore stay
relative and go through Nginx, both in production and via the Vite proxy
during `npm run dev`.

Produce the Android build and sync the assets to Android:

```bash
npm run build:android
npx cap sync android
```

`build:android` uses the Vite `android` mode and the versioned
`../.env.android` file, which points to `https://labo-iot1.iict-heig-vd.ch`.
This address is public and is not a secret. For a test target, it can be
overridden without modifying a file:

```bash
VITE_API_BASE_URL=https://example.test npm run build:android
```

Produce a debug APK from WSL or an environment without Android Studio:

```bash
cd android
./gradlew assembleDebug
```

The APK is generated in `android/app/build/outputs/apk/debug/app-debug.apk`.
The `android/local.properties` file, which configures the local SDK path, is
ignored by Git and must not be added to the repository.

The APK requires a TLS certificate that is valid and normally trusted by
Android for `labo-iot1.iict-heig-vd.ch`. The temporary self-signed certificate
used by the Nginx container on first startup is not suitable for the Android
app; a real certificate must be installed before a production test.

Open the Android project in Android Studio:

```bash
npx cap open android
```

## Technical integrations

- `/` displays the main map (MapLibre GL JS, OpenFreeMap Liberty style), with
  the discoveries, explored countries and POIs of the active map.
- React Router handles navigation between screens (`/collection`, `/add`,
  `/groups`, `/profile`, etc.), with a redirect to `/auth` for an
  unauthenticated visitor.
- The `QueryClientProvider` (TanStack Query) is set up at the root and powers
  calls to the Sterna API.
- The PWA manifest and service worker are generated during `npm run build`.
