# Frontend stack validation

## Environment

- Frontend: React 19, TypeScript, Vite 8.
- Node.js: 22.23.2 (used explicitly through nvm because the shell default was Node 20).
- npm: 10.9.8.
- Validation branch: `16-test-capacitor-integration`.

## Results

| Component | Result | Notes |
| --- | --- | --- |
| React, TypeScript, Vite and React Router | PASS | Production build succeeds; existing routes remain available. |
| Fetch API and TanStack Query | PASS | `/data` reads the local mock endpoint. |
| PWA | PASS | `vite-plugin-pwa` generates `manifest.webmanifest` and a service worker during the production build. |
| MapLibre GL JS and OpenFreeMap | PASS (web) | `/map` renders an interactive MapLibre map using OpenFreeMap's Liberty style. |
| Capacitor configuration | PASS | `capacitor.config.ts` sets `webDir: 'dist'`. |
| Android project | PASS | Generated through `npx cap add android`; web bundle synchronised with `npx cap sync android`. |
| Native geolocation implementation | PASS (configuration/build) | `/native` checks/requests permission and reads position; `/map` has a **Locate me** button that places a marker and recentres the map. Android location permissions are declared. |
| Android runtime / emulator | NOT RUN | `npx cap run android` was attempted and stopped with `ERR_SDK_NOT_FOUND: No valid Android SDK root found`; this environment also has no Java JDK, `adb`, device, or emulator. |

## Android test procedure

1. Use Node 22.23.2 and run `npm ci`, `npm run build`, then `npx cap sync android` in `app/frontend`.
2. Connect a device or start an emulator with Android Studio.
3. Run `npx cap run android` (or open `android/` in Android Studio).
4. Open `/native`, request location access, and verify the displayed latitude, longitude, and accuracy.
5. Open `/map`, select **Locate me**, and confirm that the marker and map camera move to the reported position.
6. Navigate across routes, then use Android Back to verify the WebView history returns to the previous React route before exiting.

## Limitations and issues

- Android runtime validation cannot be completed in the current environment because no Android toolchain is installed.
- The OpenFreeMap style and tiles require network access; offline map support is outside this spike.
- No Nominatim call is made from the frontend.
- `npm install` reported three moderate transitive dependency audit findings. No automatic audit fix was applied because this spike should not make unrelated dependency upgrades.

## Conclusion

Capacitor is suitable for the Sterna MVP: the Vite build is embedded through `dist`, Android can be generated and synchronised, and the geolocation plugin is integrated through a small React surface. A final device/emulator run is required to turn the Android-runtime result from pending to validated.
