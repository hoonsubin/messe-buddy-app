#!/bin/sh
# App container entrypoint.
#
# Runs before supervisord. Reads the front-end virtual key minted at runtime by
# file-watcher's bootstrap step (shared volume at /runtime/virtual_key),
# renders the nginx config with that key injected into the /llm proxy, and
# writes the runtime config.js the PWA reads at boot. Then hands off to
# supervisord.
set -eu

KEY_FILE="/runtime/virtual_key"
NGINX_TEMPLATE="/etc/nginx/sites-available/default.template"
NGINX_CONF="/etc/nginx/sites-available/default"
CONFIG_JS="/usr/share/nginx/html/config.js"
SSL_DIR="/etc/nginx/ssl"
SSL_CERT="$SSL_DIR/server.crt"
SSL_KEY="$SSL_DIR/server.key"

# ── TLS certificate ─────────────────────────────────────────────────────────
# If no cert is present (e.g. from a volume mount), generate a self-signed one.
# Mount a mkcert-generated or Let's Encrypt cert at $SSL_CERT / $SSL_KEY to
# avoid the browser "Not secure" warning for LAN devices.
#
# crypto.subtle and getUserMedia require a Secure Context (https:// or localhost).
# HTTP on a LAN IP (192.x, 10.x, …) is NOT a Secure Context regardless of port.
if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
  echo "entrypoint: no TLS cert found at $SSL_CERT — generating self-signed cert"
  mkdir -p "$SSL_DIR"
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_KEY" \
    -out "$SSL_CERT" \
    -subj "/CN=messebuddy-local" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" \
    2>/dev/null
  echo "entrypoint: self-signed cert written to $SSL_DIR"
  echo "entrypoint: NOTE — browsers will show a security warning for LAN IPs."
  echo "            For trusted HTTPS: run 'mkcert <your-lan-ip>' on the host"
  echo "            and mount the generated files to $SSL_DIR/server.{crt,key}"
else
  echo "entrypoint: TLS cert found at $SSL_CERT"
fi

# ── Virtual key ─────────────────────────────────────────────────────────────
# This container does NOT wait on file-watcher's bootstrap (only on litellm
# being healthy) — bootstrap mints the key in the background, independent
# of however long document ingestion takes, so the app can start serving
# pages immediately. This poll is the real wait for that key to land, not
# just a guard against an edge case.
i=0
while [ "$i" -lt 30 ]; do
  [ -s "$KEY_FILE" ] && break
  echo "entrypoint: waiting for $KEY_FILE ($i)…"
  i=$((i + 1))
  sleep 1
done

KEY="$(cat "$KEY_FILE" 2>/dev/null || true)"
if [ -z "$KEY" ]; then
  echo "entrypoint: WARNING - no virtual key found at $KEY_FILE; the assistant"
  echo "             will fail to authenticate until one is provisioned."
fi
export KEY

# Render nginx config, substituting ONLY ${KEY} (leaves $host, $uri, … intact).
envsubst '${KEY}' < "$NGINX_TEMPLATE" > "$NGINX_CONF"

# Front-end runtime config: same-origin proxy for LLM and PB.
# llmBaseUrl: same-origin /llm proxy (nginx injects Authorization server-side).
# Live vs. mock chat is decided at runtime by the PWA itself (it polls
# /llm/health/readiness) - no useMockChat flag to set here.
# pbUrl: unset (browser uses same-origin /api; the adapter defaults to /api).
cat > "$CONFIG_JS" <<'EOF'
window.__MB_CONFIG__ = { llmBaseUrl: "/llm", useMockPb: false };
EOF

echo "entrypoint: configured /llm proxy and config.js; starting supervisord"
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
