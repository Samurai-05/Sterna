# Contributing

Please read this before contributing.

## Getting started

```bash
git clone git@github.com:Samurai-05/Sterna.git
cd Sterna
cp .env.example .env
docker compose up
```

As of Sprint 0, `docker compose up` starts the Nginx deployment placeholder, PostgreSQL, and MinIO. The placeholder is available at http://localhost:8080 (default, configurable via `WEB_PORT` in `.env`). The application frontend and API are not yet part of this checkout, so a dedicated app/API URL is not documented here — this section will be updated once the Nginx routing layer described in `docs/architecture.md` is provisioned in Sprint 1.

## Workflow

We use **GitHub Flow**: `main` is always deployable, all work goes through a branch and a pull request.

1. Create or pick up an issue on the [board]().
2. Create a branch from `main`.
3. Develop, commit, push.
4. Open a pull request linked to the issue.
5. Get it reviewed, address feedback, merge.

Every issue is automatically added to the board. Move your card through the columns as you go: `Todo` → `In progress` → `Done`.

## Issues

Use the templates offered when opening a new issue.

| Label | Use |
|---|---|
| `feature` | New functionality |
| `bug` | Fix |
| `infra` | CI/CD, deployment, tooling |
| `docs` | Documentation |

Issues tied to a deliverable are attached to the corresponding milestone (`Week 1 – 08.24`, `Final deliverable – 09.04`).
