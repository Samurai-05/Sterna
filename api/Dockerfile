# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# base — dependency manifests only, so editing source code does not invalidate
# the (slow) npm install layer.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---------------------------------------------------------------------------
# development — full dependency tree and Nest watch mode. This is the target
# docker-compose builds; the source directory is bind-mounted over /app.
# ---------------------------------------------------------------------------
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
# uid 1000, matching the usual Linux desktop user: files the watcher writes
# into the bind mount (dist/, *.tsbuildinfo) stay owned by you on the host.
USER node
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---------------------------------------------------------------------------
# build — compile TypeScript, then reinstall without dev dependencies so only
# runtime packages are carried into the final image.
# ---------------------------------------------------------------------------
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build && npm ci --omit=dev

# ---------------------------------------------------------------------------
# production — runtime only: no compiler, no test tooling, no source.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
