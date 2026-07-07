# MesseBuddy - PocketBase seed (one-shot)
#
# Runs docker/pb-seed/seed.ts once against a running `app` container's
# PocketBase (through its nginx /api proxy) to register the shared library
# resources + the "Messe München Onboarding" template. See docker-compose.yml
# for the `pb-seed` service and seed.ts for why this exists server-side now
# instead of only as a side effect of a browser loading the PWA.
#
# Reuses the exact same src/ use-cases (seedLibraryResources, seedTemplates)
# the app itself has — this is not a reimplementation, just a different
# runtime entrypoint for the same idempotent TS code.
FROM denoland/deno:2.8.1

WORKDIR /app

# Manifests first so this layer is cached when only src/ changes.
COPY deno.json deno.lock ./

# Retry loop: transient npm registry drops during parallel compose builds
# are common and non-deterministic (same workaround as the main Dockerfile).
RUN for i in 1 2 3; do \
      deno install && break; \
      echo "deno install failed (attempt $i) — retrying in 3s..."; \
      sleep 3; \
    done

COPY src/ src/
COPY docker/pb-seed/seed.ts docker/pb-seed/seed.ts

RUN deno cache docker/pb-seed/seed.ts

CMD ["deno", "run", "-A", "docker/pb-seed/seed.ts"]
