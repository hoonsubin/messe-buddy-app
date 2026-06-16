#!/bin/sh
# App container entrypoint.
#
# Runs before supervisord. Reads the front-end virtual key minted at runtime by
# init-vector-store (shared volume at /runtime/virtual_key), renders the nginx
# config with that key injected into the /llm proxy, and writes the runtime
# config.js the PWA reads at boot. Then hands off to supervisord.
set -eu

KEY_FILE="/runtime/virtual_key"
NGINX_TEMPLATE="/etc/nginx/sites-available/default.template"
NGINX_CONF="/etc/nginx/sites-available/default"
CONFIG_JS="/usr/share/nginx/html/config.js"

# init-vector-store completes before this container starts (compose depends_on
# service_completed_successfully), but guard against an empty/late file.
i=0
while [ "$i" -lt 30 ]; do
  [ -s "$KEY_FILE" ] && break
  echo "entrypoint: waiting for $KEY_FILE ($i)…"
  i=$((i + 1))
  sleep 1
done

KEY="$(cat "$KEY_FILE" 2>/dev/null || true)"
if [ -z "$KEY" ]; then
  echo "entrypoint: WARNING — no virtual key found at $KEY_FILE; the assistant"
  echo "             will fail to authenticate until one is provisioned."
fi
export KEY

# Render nginx config, substituting ONLY ${KEY} (leaves $host, $uri, … intact).
envsubst '${KEY}' < "$NGINX_TEMPLATE" > "$NGINX_CONF"

# Front-end runtime config: same-origin proxy, real (non-mock) chat.
cat > "$CONFIG_JS" <<'EOF'
window.__MB_CONFIG__ = { llmBaseUrl: "/llm", useMockChat: false };
EOF

echo "entrypoint: configured /llm proxy and config.js; starting supervisord"
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
