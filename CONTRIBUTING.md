# Contributing

Please read this before contributing.

## Getting started

```bash
git clone git@github.com:Samurai-05/Sterna.git
cd Sterna
cp .env.example .env
docker compose up
```

| Service | URL | Note |
|---|---|---|
| API | http://localhost:3000/api | `API_PORT`; check `GET /api/health` |
| API documentation | http://localhost:3000/api/docs | Swagger UI, generated from the code |
| App | https://localhost:8443 | `WEB_TLS_PORT`; self-signed certificate, so expect a browser warning |
| App (HTTP) | http://localhost:8080 | `WEB_PORT`; redirects to the HTTPS port above |
| MinIO console | http://localhost:9001 | Credentials from `.env` |
| PostgreSQL | localhost:5432 | PostgreSQL + PostGIS |

Confirm the stack came up correctly:

```bash
docker compose ps -a
curl http://localhost:3000/api/health
```

The `api`, `postgres`, and `minio` services should be healthy; `web` and
`certbot` should be running; and the one-shot `minio-init` service should have
exited successfully. The health response confirms both persistent
dependencies:

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "storage": { "status": "up" }
  }
}
```

### Working on the API

`docker compose up` runs the API in watch mode with `api/` mounted into the container, so
saving a file recompiles and restarts it — there is nothing to rerun by hand. Commands go
through the container, which already has the database environment:

```bash
docker compose exec api npm test           # unit tests
docker compose exec api npm run test:e2e   # end-to-end tests (needs the database)
docker compose exec api npm run lint:ci    # what CI runs
docker compose exec api npm run migration:run
```

After adding a dependency to `api/package.json`, rebuild — the container's `node_modules` is
a volume created when the image was built, so an install done on the host is invisible
inside it:

```bash
docker compose up -d --build --renew-anon-volumes api
```

Details, project layout and conventions: [`api/README.md`](api/README.md).

### Working on the frontend

The frontend has no watch-mode container of its own — `docker compose up` builds and serves
it through Nginx like production would. For day-to-day frontend work, run Vite directly on
the host, alongside the rest of the stack; it proxies `/api` to `http://localhost:3000`:

```bash
cd frontend
npm install
npm run dev
```

Details, project layout and conventions: [`frontend/README.md`](frontend/README.md).

Two files describe the stack, and the split matters: `docker-compose.yml` is the production
definition (prebuilt image, no bind mount, no published API port) and
`docker-compose.override.yml` adds the development conveniences. Compose merges them
automatically for you; the deployment workflow passes `-f docker-compose.yml` so the VM only
gets the first one. Anything development-only belongs in the override file.

## Workflow

We use **GitHub Flow**: `main` is always deployable, all work goes through a branch and a pull request.

1. Create or pick up an issue on the GitHub Projects board.
2. Create a branch from `main`.
3. Develop, commit, push.
4. Open a pull request linked to the issue.
5. Get it reviewed, address feedback, merge.

Every issue is automatically added to the board. Move your card through the columns as you go: `Todo` → `In progress` → `Done`.

## Issues

Create an issue with a clear problem or outcome, acceptance criteria, the most
relevant label, and the appropriate sprint milestone. The repository does not
currently provide issue templates.

| Label | Use |
|---|---|
| `enhancement` | New functionality or improvement |
| `bug` / `fix` | Defect or corrective change |
| `documentation` / `README` | Documentation changes |
| `Test` | Automated testing work |
| `accessibility` | Accessibility improvements |
| `Security` | Security-related work |

Issues are attached to the relevant project milestone: `Sprint 0 - Foundations`,
`Sprint 1 - MVP`, or `Sprint 2 - Consolidations`.

## Deployment: TLS certificate

Nginx is the public entry point (ADR-007): it serves the built frontend,
terminates TLS, and proxies `/api` to the API container. The web/PWA client is
served from that same origin and therefore needs no CORS access. The API also
allows the single `https://localhost` origin used by the packaged Capacitor
Android application, with only the required methods and the `Content-Type` and
`Authorization` headers.

On first boot the image mints a temporary self-signed certificate, purely so Nginx can
start: it refuses to boot when `ssl_certificate` points at a file that does not exist, and
it has to be running to answer the ACME challenge that would create the real one.

Issuing the real certificate is a one-time manual step on the VM. Run the dry run first —
Let's Encrypt rate-limits failed issuance, and a misconfigured DNS record burns that budget
quickly:

```bash
docker compose -f docker-compose.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d labo-iot1.iict-heig-vd.ch \
  --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email --dry-run
```

Drop `--dry-run` once it succeeds, then `docker compose -f docker-compose.yml restart web`
so Nginx picks the new certificate up. Renewal is automatic from then on: the `certbot`
service checks twice a day, and Nginx reloads every six hours.

**Before issuing, confirm Let's Encrypt can actually reach the host.** The VM's IPv4
(`10.190.132.88`) is a private address, so HTTP-01 validation depends on its public IPv6
address. From a network outside the campus:

```bash
dig AAAA labo-iot1.iict-heig-vd.ch
curl -6 -I http://labo-iot1.iict-heig-vd.ch
```

If the AAAA record does not resolve to the VM, or port 80 does not answer, ACME issuance
cannot work from here. The stack still serves HTTPS on the self-signed certificate in that
case; the alternative is a certificate issued by the school.
