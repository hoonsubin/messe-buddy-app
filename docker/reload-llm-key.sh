#!/bin/sh
# Keeps the /llm proxy's Authorization header in sync with whatever virtual
# key file-watcher currently considers valid — without app ever waiting on
# file-watcher at startup.
#
# Why this exists: entrypoint.sh renders nginx.conf's ${KEY} exactly once, at
# container boot, via envsubst. file-watcher mints a fresh virtual key on
# every one of its OWN bootstraps (by design — see its provision_virtual_key
# docstring, which exists specifically to avoid stale keys surviving
# `docker compose down -v`). app has no dependency on file-watcher being
# "ready" — intentionally: file-watcher's own dependency chain (vector-db,
# litellm-pgvector, litellm, litellm-db all healthy) plus document ingestion
# can legitimately take a long time on a cold/greenfield boot, and blocking
# the whole web app on that would defeat the entire point of minting the key
# before ingestion instead of after.
#
# The result: whenever file-watcher restarts or is simply slower to bootstrap
# than app is to boot, app's baked-in key silently goes stale (LiteLLM no
# longer recognizes it — "token_not_found_in_db") and nothing corrects it,
# because nginx's rendered config is never touched again after the first
# render. This loop is the fix: poll the shared runtime file for changes and
# hot-reload nginx whenever the key actually differs from what's currently
# live. Mirrors the existing nginx-reload program in supervisord.conf (same
# idea, for TLS certs instead of the virtual key).
set -u

KEY_FILE="/runtime/virtual_key"
NGINX_TEMPLATE="/etc/nginx/sites-available/default.template"
NGINX_CONF="/etc/nginx/sites-available/default"
POLL_INTERVAL="${LLM_KEY_POLL_INTERVAL:-5}"

DOMAIN="${PUBLIC_DOMAIN:-_}"
export DOMAIN

# Seed last_key with whatever entrypoint.sh already rendered into NGINX_CONF
# (empty string if it rendered with no key at all), so a file-watcher key
# that was already picked up at boot doesn't trigger a redundant reload here.
last_key="$(sed -n 's/.*Authorization "Bearer \(.*\)";/\1/p' "$NGINX_CONF" 2>/dev/null | head -n1 || true)"

echo "llm-key-reload: watching $KEY_FILE every ${POLL_INTERVAL}s (baseline key: ${last_key:+set}${last_key:-empty})"

while true; do
  sleep "$POLL_INTERVAL"

  [ -s "$KEY_FILE" ] || continue
  current_key="$(cat "$KEY_FILE" 2>/dev/null || true)"
  [ -n "$current_key" ] || continue

  if [ "$current_key" != "$last_key" ]; then
    KEY="$current_key"
    export KEY
    if envsubst '${KEY} ${DOMAIN}' < "$NGINX_TEMPLATE" > "$NGINX_CONF.tmp" \
        && mv "$NGINX_CONF.tmp" "$NGINX_CONF" \
        && nginx -t >/dev/null 2>&1 \
        && nginx -s reload; then
      echo "llm-key-reload: picked up a new virtual key, reloaded nginx"
      last_key="$current_key"
    else
      echo "llm-key-reload: WARNING — failed to render/reload with new key, will retry next poll"
    fi
  fi
done
