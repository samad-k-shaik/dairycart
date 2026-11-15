# Frontend image (#57): build the React app with Node, serve the static files with nginx (ADR-008).
#
# Build from the repository root:
#   docker build -f infrastructure/docker/frontend.Dockerfile \
#     --build-context docker-config=infrastructure/docker \
#     --build-arg VITE_API_BASE_URL=http://localhost:8000/api/v1 -t dairycart-frontend frontend
#
# Build context = frontend/ (the app code). The extra "docker-config" context is this
# folder, so the image can read nginx.conf without copying all of the repository.
#
# Two stages:
#   1. "build": Node + all npm packages compile the app into plain files in dist/.
#   2. Final: only nginx + those files. No Node, no node_modules → a small image.

# ---------- Stage 1: build the app ----------
# Node 24 LTS: Vite 8 needs Node 20.19+ / 22.12+, and Node 20 reached end of life in April 2026.
FROM node:24-alpine AS build
WORKDIR /app

# Copy package files first so `npm ci` is cached while dependencies are unchanged.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite writes VITE_* values INTO the JavaScript at build time; they cannot change later.
# A different backend address therefore needs a new build (pass another --build-arg).
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_MOCKS=false

# Type-check + production build → /app/dist
RUN npm run build


# ---------- Stage 2: serve the files ----------
FROM nginx:1.29-alpine

# The nginx image turns /etc/nginx/templates/*.template into real config at start-up,
# filling in environment variables such as ${PORT}.
COPY --from=build /app/dist /usr/share/nginx/html
# The config lives next to this Dockerfile; Compose mounts it via additional_contexts (see docker-compose.yml).
COPY --from=docker-config nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run sets PORT itself; locally the container listens on 8080.
ENV PORT=8080
EXPOSE 8080
