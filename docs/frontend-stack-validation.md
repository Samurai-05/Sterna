# Frontend stack validation

## Environment

- Frontend: React 19, TypeScript, Vite 8.
- Node.js: 22.23.2.
- npm: 10.9.8.
- Validation branch: `16-test-capacitor-integration`.
- Android validation: Android Studio and Android SDK on Windows, using an Android emulator.

## Results

| Component | Result | Notes |
| --- | --- | --- |
| React, TypeScript, Vite and React Router | PASS | Production build succeeds; existing routes remain available. |
| Fetch API and TanStack Query | PASS | `/data` reads the local mock endpoint. |
| PWA | PASS | `vite-plugin-pwa` generates `manifest.webmanifest` and a service worker during the production build. |
| MapLibre GL JS and OpenFreeMap | PASS | `/map` renders an interactive MapLibre map using OpenFreeMap's Liberty style, including in the Android WebView. |
| Capacitor configuration | PASS | `capacitor.config.ts` sets `webDir: 'dist'`. |
| Android project and Gradle sync | PASS | Generated through `npx cap add android`; web bundle synchronised with `npx cap sync android` and Gradle sync succeeds. |
| Android runtime / emulator | PASS | The application was run successfully on an Android emulator. |
| Native geolocation permission | PASS | Android location permission was accepted. |
| Native geolocation | PASS | `/native` returns latitude, longitude, and accuracy for the emulator's simulated position. |
| GPS position on map | PASS | `/map` **Locate me** reads the native position, recentres MapLibre, and creates or moves the marker. |

## Android test procedure

1. Build the frontend with Node 22.23.2 / npm 10.9.8, then run `npx cap sync android` in `app/frontend`.
2. Start the Android emulator from Android Studio on Windows and run the Capacitor Android app.
3. Open `/native`, accept location access, set a simulated location, and verify latitude, longitude, and accuracy.
4. Open `/map`, select **Locate me**, and confirm that the marker and map camera move to the native position.

## Limitations and issues

- The initial WSL environment did not include an Android SDK. Android runtime validation was completed with Android Studio and the Android SDK on Windows.
- Windows initially used Node 18.13.0; it was upgraded to Node 22.23.2 with npm 10.9.8 for this project.
- PowerShell blocked `npm.ps1`; `npm.cmd` and `npx.cmd` were used instead.
- Capacitor Gradle files were absent before the first `npx cap sync android`; building with Vite and synchronising Capacitor generated the required files.
- Java 25 was incompatible with Gradle 8.14.3; Java 21 was used for the Android build.
- A MapLibre marker was initially added before `setLngLat`, causing an `undefined.lng` error. The marker now receives `[longitude, latitude]` before `addTo(map)`.
- The Android WebView initially kept an old frontend bundle. Uninstalling and reinstalling Sterna ensured the new embedded bundle was tested.
- MapLibre initially attempted to load `https://localhost/assets/maplibre-gl-worker.mjs`, which was absent from Capacitor assets. The worker is now imported through Vite with `?worker&url` and registered with `maplibregl.setWorkerUrl(workerUrl)`.
- The OpenFreeMap style and tiles require network access; offline map support is outside this spike.
- No Nominatim call is made from the frontend.
- The MapLibre bundle is larger than 500 kB; Vite reports a non-blocking chunk-size warning.
- `npm install` reported three moderate transitive dependency audit findings. No automatic audit fix was applied because this spike should not make unrelated dependency upgrades.

## Conclusion

Capacitor is suitable for the Sterna MVP. The React/Vite frontend runs successfully on Android through Capacitor, native geolocation is validated on an Android emulator, and the native position is successfully integrated with MapLibre. Issue #16 is validated.
