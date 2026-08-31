# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# build — compile the Vite app to static assets.
#
# NODE_ENV is deliberately left unset: `npm run build` is `tsc -b && vite build`,
# which needs the dev dependencies, and `npm ci` skips them under
# NODE_ENV=production.
#
# No .env is copied in, and none can be: vite.config.ts sets `envDir: '..'`,
# which resolves outside this build context. That is the behaviour production
# wants — VITE_API_BASE_URL falls back to '' (src/lib/api.ts), so the PWA calls
# /api/... same-origin and the server block below routes it, while
# VITE_ENABLE_AUTH_SKIP stays undefined, keeping the development auth bypass off.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# production — Nginx as the public entry point (ADR-007): it serves the built
# PWA, terminates TLS and reverse proxies /api to the API container. The API
# enables no CORS, so the frontend has to be same-origin with it; this image
# being both is what makes that true.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Not in the base image, and 10-ensure-cert.sh needs it to mint the temporary
# self-signed certificate that lets Nginx boot before a real one exists.
RUN apk add --no-cache openssl

COPY --from=build /app/dist /usr/share/nginx/html

# The image's own entrypoint renders *.template through envsubst into
# /etc/nginx/conf.d/ at startup, which keeps the domain a runtime variable
# instead of baking it into the image.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/10-ensure-cert.sh /docker-entrypoint.d/10-ensure-cert.sh
COPY nginx/40-reload-for-renewals.sh /docker-entrypoint.d/40-reload-for-renewals.sh
RUN chmod +x /docker-entrypoint.d/10-ensure-cert.sh \
             /docker-entrypoint.d/40-reload-for-renewals.sh

EXPOSE 80 443
