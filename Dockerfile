# ─── Stage 1: PWA Build (Deno) ────────────────────────────────────────────
# Builds the React PWA into static assets using Deno as the runtime.
FROM denoland/deno:2.8.1 AS pwa-builder

WORKDIR /app

# Copy manifests first so the layer is cached when only source changes
COPY deno.json deno.lock ./
COPY scripts/ scripts/

# Pre-fetch all npm dependencies declared in deno.json imports
RUN deno install

# Copy source
COPY . .

# PocketBase URL is /api (same-origin nginx proxy in production).
# VITE_USE_MOCK_PB=false ensures the real PocketBase adapter is used.
ARG VITE_PB_URL=/api
ARG VITE_USE_MOCK_PB=false
ARG VITE_LITELLM_URL=http://localhost:4000
ARG VITE_LITELLM_KEY=
ARG VITE_LITELLM_MODEL=policy-assistant
ARG VITE_USE_MOCK_CHAT=true

RUN VITE_PB_URL=${VITE_PB_URL} \
    VITE_USE_MOCK_PB=${VITE_USE_MOCK_PB} \
    VITE_LITELLM_URL=${VITE_LITELLM_URL} \
    VITE_LITELLM_KEY=${VITE_LITELLM_KEY} \
    VITE_LITELLM_MODEL=${VITE_LITELLM_MODEL} \
    VITE_USE_MOCK_CHAT=${VITE_USE_MOCK_CHAT} \
    deno task build


# ─── Stage 2: Go PocketBase Server Build ──────────────────────────────────
# Compiles a custom PocketBase wrapper that embeds:
#   - pb_migrations/   (auto-creates collections on first run)
#   - pwa-dist/        (PWA static files from Stage 1)
FROM golang:1.25-bookworm AS go-builder

WORKDIR /go-app

# Copy all Go source (go.mod + main.go + pb_migrations/)
COPY server/ ./

# Copy PWA build output for embedding
COPY --from=pwa-builder /app/dist ./pwa-dist

# Resolve dependencies and build static binary.
# go mod tidy must run AFTER source is present so it can discover all imports.
# CGO disabled for fully static linking (no libc dependency).
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /pb-server .


# ─── Stage 3: Runtime ─────────────────────────────────────────────────────
# Single container running:
#   • nginx     — serves PWA static files on :80
#   • pocketbase-server — REST + SSE backend on :8090
# Both managed by supervisord.
FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
        ca-certificates \
        gettext-base \
    && rm -rf /var/lib/apt/lists/*

# PWA static files
COPY --from=pwa-builder /app/dist /usr/share/nginx/html

# PocketBase server binary (Go wrapper with embedded migrations)
COPY --from=go-builder /pb-server /usr/local/bin/pocketbase-server
RUN chmod +x /usr/local/bin/pocketbase-server

# Configuration. nginx.conf is a TEMPLATE — entrypoint.sh renders it at startup
# (envsubst ${KEY}) into the live config so the runtime virtual key is injected.
COPY docker/nginx.conf /etc/nginx/sites-available/default.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# PocketBase data directory (mount a named volume here in production)
VOLUME ["/pb_data"]

# nginx (PWA) :80  |  PocketBase :8090
EXPOSE 80 8090

CMD ["/entrypoint.sh"]
