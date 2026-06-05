# Multi-stage build for Research Commons.
# The repo is an npm workspace: the backend (root) plus the `shared` and `frontend` packages.
# The backend and frontend both depend on the built `@anima-labs/research-commons-shared`
# package, so everything is installed and built together in one workspace-aware stage.
FROM node:20-alpine AS base

# --- Build stage: install the whole workspace, then build shared -> backend -> frontend ---
FROM base AS builder
WORKDIR /app

# Copy every workspace manifest first so `npm ci` can resolve the workspace graph (this keeps
# the dependency install cached independently of source changes).
COPY package*.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN npm ci

# Sources
COPY tsconfig.json ./
COPY shared ./shared
COPY src ./src
COPY frontend ./frontend

# build:full = build shared (emits shared/dist) -> tsc backend -> vite build frontend
RUN npm run build:full

# --- Production image ---
FROM base AS production
WORKDIR /app

# Install fonts for SVG rendering (sharp/librsvg needs these)
RUN apk add --no-cache fontconfig ttf-dejavu ttf-liberation

# Production dependencies only. The shared + frontend manifests must be present so npm can
# resolve the workspace graph and symlink @anima-labs/research-commons-shared into node_modules
# (its compiled dist is copied from the builder below). `prepare` is skipped for --omit=dev,
# so the shared package is not rebuilt here.
COPY package*.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev

# Built shared package — required so `node dist/index.js` can resolve the workspace import.
COPY --from=builder /app/shared/dist ./shared/dist

# Built backend (tsc does not copy the SQL schema, so copy it explicitly)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/schema.sql ./dist/database/

# Built frontend (served statically by the backend in production)
COPY --from=builder /app/frontend/dist ./frontend/dist

# Initialization scripts
COPY create-default-ontologies.ts ./
COPY create-default-rankings.ts ./
COPY create-default-models.ts ./

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3020

# Start command
CMD ["node", "dist/index.js"]
