# ─── Stage 1: Build ────────────────────────────────────────────────────────────
# Builds the React PWA into static assets using Deno as the runtime.
# deno.json is the source of truth; package.json is never committed.
FROM denoland/deno:2.8.1 AS builder

WORKDIR /app

# Copy manifests first so the layer is cached when only source changes
COPY deno.json deno.lock ./
COPY scripts/ scripts/

# Pre-fetch all npm dependencies declared in deno.json imports
RUN deno install --entrypoint deno.json

# Copy source
COPY . .

# Build args are baked into the JS bundle by Vite at build time.
# Set these to the public-facing URLs the browser will reach.
ARG VITE_PB_URL=http://localhost:8090
ARG VITE_LITELLM_URL=http://localhost:4000

RUN VITE_PB_URL=${VITE_PB_URL} VITE_LITELLM_URL=${VITE_LITELLM_URL} \
    deno task build


# ─── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Single container image running:
#   • nginx  — serves the compiled PWA static files
#   • PocketBase — REST + SSE backend on :8090
# Both processes are managed by supervisord.
FROM debian:bookworm-slim AS runtime

# Install runtime deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
        ca-certificates \
        unzip \
    && rm -rf /var/lib/apt/lists/*

# Download PocketBase binary
ARG PB_VERSION=0.23.0
RUN curl -fsSL \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    -o /tmp/pb.zip \
    && unzip -q /tmp/pb.zip -d /usr/local/bin pocketbase \
    && chmod +x /usr/local/bin/pocketbase \
    && rm /tmp/pb.zip

# PWA static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# PocketBase data directory (mount a named volume here in production)
VOLUME ["/pb_data"]

# nginx (PWA) :80  |  PocketBase :8090
EXPOSE 80 8090

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
