# CI/CD

This document describes the CI/CD pipeline set up during Sprint 0. It covers
what the pipeline does today and what is intentionally still open, rather than
describing a target state that isn't running yet.

## Overview

Every push and pull request goes through the same GitHub Actions pipeline,
split into two stages:

- **CI (Continuous Integration)** — validates a change.
- **CD (Continuous Deployment)** — ships a validated change to the target
  environment.

CI must pass before a pull request can be merged into `main`; a merge into
`main` then triggers CD, so the reviewed change reaches the running
environment without any manual step. This matches the Sprint 0 exit criterion
described in `docs/work_process.md`: a commit pushed to the repository is
automatically built, verified and deployed without manual intervention.

## CI — Continuous Integration

Runs on pull requests targeting `main` and on pushes to `main`:

- **Build** of the application.
- **Automated tests.**
  - Not yet explicitly implemented: there is no concrete application code to
    test yet (Sprint 0 focused on infrastructure, not features), so this step
    currently has nothing meaningful to run. It will be filled in as soon as
    Sprint 1 produces testable code, per `NFR-30` / `NFR-31`.
- **CI is required for merge.** A pull request cannot be merged into `main`
  unless the pipeline passes, so a broken build cannot reach `main`.
- **Android debug build.** The dedicated Android job builds Android web assets
  with `npm run build:android`, synchronizes Capacitor, and compiles with
  `./gradlew assembleDebug` from `frontend/android`. Pull requests validate the
  build; on a push to `main`, the generated debug APK is published as the
  `sterna-debug-apk` GitHub Actions artifact.

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

## Current status (end of Sprint 0)

- The pipeline (CI build/test gate + CD image build, publish, and
  registry-pull deployment) is in place and running.
- The Nginx reverse proxy and the rest of the single-VM architecture
  described in `docs/architecture.md` are not deployed yet — PostgreSQL and
  MinIO are containerized and covered by the pipeline, but the layer that
  exposes the app behind Nginx is still to be provisioned early in Sprint 1.
- Automated tests are not yet meaningful, since there is no feature code yet
  to test; the CI step exists and gates merges, but currently has an empty or
  placeholder test suite.

## Open points for Sprint 1

- Provision the Nginx / VM layer described in `docs/architecture.md`.
- Add real automated tests (starting with the critical behaviors listed in
  `NFR-31`: authentication, discovery creation, group access, unauthorized
  access rejection, active-context association, context switching) so the CI
  test step becomes meaningful rather than a placeholder.
