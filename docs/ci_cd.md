# CI/CD

This document describes the CI/CD pipeline, set up during Sprint 0 and kept up
to date since. It covers what the pipeline actually does, rather than
describing a target state that isn't running yet.

## Overview

Pull requests and pushes to `main` go through the existing GitHub Actions
pipeline, split into two stages:

- **CI (Continuous Integration)** — validates a change.
- **CD (Continuous Deployment)** — ships a validated change to the target
  environment.

CI must pass before a pull request can be merged into `main`; a merge into
`main` then triggers CD, so the reviewed change reaches the running
environment without any manual step. This matches the Sprint 0 exit criterion
described in `docs/work_process.md`: a commit pushed to the repository is
automatically built, verified and deployed without manual intervention.
Version-tagged Android releases use the separate workflow described below.

## CI — Continuous Integration

Runs on pull requests targeting `main` and on pushes to `main`, as three parallel jobs
defined in `.github/workflows/ci.yml`:

- **`frontend`.** Installs dependencies, lints, runs the Vitest suite (`npm test -- --run`),
  builds the app, then builds the production Docker image — which catches issues the
  source build alone would miss, such as an import reaching outside the `frontend/`
  build context.
- **`api`.** Installs dependencies, lints with `lint:ci` (no `--fix`, so CI reports
  problems instead of silently repairing them), runs the Jest unit suite, builds, then
  builds the production Docker image.
- **`android`.** Builds the Android web assets with `npm run build:android`,
  synchronizes Capacitor, and compiles with `./gradlew assembleDebug` from
  `frontend/android`. Pull requests validate the build; on a push to `main`, the
  generated debug APK is published as the `sterna-debug-apk` GitHub Actions artifact.
- **CI is required for merge.** A pull request cannot be merged into `main`
  unless every job passes, so a broken build or a failing test cannot reach `main`.

## Android releases

The separate `Android Release` workflow runs only when a version tag matching
`v*` is pushed. Version tags should use the `vMAJOR.MINOR.PATCH` convention,
for example `v0.1.0`.

The workflow checks out the tagged commit, validates the frontend, runs
`npm run build:android`, synchronizes Capacitor, and assembles a signed release
APK. The Android build uses the Android-specific Vite mode, which excludes the
PWA service worker from the Capacitor bundle. The APK is attached to the GitHub
Release for the tag as `Sterna-vMAJOR.MINOR.PATCH.apk` (for example,
`Sterna-v0.1.0.apk`).

### Required GitHub Actions secrets

Before publishing the first release, configure these repository secrets:

| Secret                             | Contents                                      |
| ---------------------------------- | --------------------------------------------- |
| `STERNA_ANDROID_KEYSTORE_BASE64`   | The release keystore file encoded as Base64.  |
| `STERNA_ANDROID_KEYSTORE_PASSWORD` | Password for the keystore.                    |
| `STERNA_ANDROID_KEY_ALIAS`         | Alias of the release key inside the keystore. |
| `STERNA_ANDROID_KEY_PASSWORD`      | Password for the release key.                 |

Create or obtain the release keystore privately, then encode the binary file
without committing it. On Linux, for example:

```bash
keytool -genkeypair -v -keystore sterna-release.keystore \
  -alias sterna -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 sterna-release.keystore
```

Store the final Base64 output in `STERNA_ANDROID_KEYSTORE_BASE64`; store the
keystore and key passwords and the alias in their corresponding secrets. The
workflow decodes the keystore only into the ephemeral GitHub Actions runner,
and Gradle reads all signing values from the workflow environment.

### Publishing a release

From a clean checkout of the commit to release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

After the workflow completes, download the generated APK from the GitHub
Release page for `v0.1.0`.

## CD — Continuous Deployment

Runs after a merge into `main`:

1. **Build the Docker image** for the application.
2. **Publish the image to the GitHub Container Registry.**
3. **Deploy automatically to the target environment.**
   - Performed from a **self-hosted runner** running on the target VM itself,
     which pulls the newly published image and restarts the corresponding
     service.
   - Deliberately **no SSH/SCP** step: the pipeline never pushes credentials
     or files into the VM from the outside. The runner living on the VM pulls
     from the registry instead, which keeps the VM as the only place that
     needs registry credentials.

## Current status

- The pipeline (CI build/test gate + CD image build, publish, and
  registry-pull deployment) is in place and running.
- The Nginx reverse proxy and the rest of the single-VM architecture
  described in `docs/architecture.md` are deployed: `deploy.yml` applies
  pending database migrations, brings up the full stack, waits for the API
  healthcheck, and verifies the app is reachable through Nginx (HTTP→HTTPS
  redirect, the app itself, and `/api/health` proxied through) before
  considering the deploy successful.
- CI runs real automated tests for both the frontend (Vitest) and the API
  (Jest), covering the critical behaviors `NFR-31` lists — authentication,
  discovery creation, group access and its rejection, and active-context
  association and switching — among others.
