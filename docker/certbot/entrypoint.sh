#!/bin/sh
# certbot sidecar entrypoint.
#
# Responsibilities:
#   1. Issue a cert for $PUBLIC_DOMAIN on first boot if none exists yet.
#   2. Copy it into the shared nginx_ssl volume as server.crt/server.key —
#      fixed names, so nginx.conf never needs to know the domain or care
#      whether the cert came from Let's Encrypt, mkcert, or self-signed.
#   3. Loop `certbot renew` every 12h; its --deploy-hook re-copies on
#      success. The app container's nginx-reload supervisor program (see
#      docker/supervisord.conf) picks up the refreshed files on its own
#      schedule — this container has no way to reach into that one directly
#      (no shared docker socket, intentionally).
#
# If PUBLIC_DOMAIN is unset (local/LAN dev), idle forever: entrypoint.sh's
# self-signed-cert fallback in the app container already covers that case,
# and there's nothing for certbot to do without a public, resolvable domain.
set -eu

DOMAIN="${PUBLIC_DOMAIN:-}"
EMAIL="${CERTBOT_EMAIL:-}"
WEBROOT=/var/www/certbot
LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
DEST_CERT=/nginx_ssl/server.crt
DEST_KEY=/nginx_ssl/server.key

if [ -z "$DOMAIN" ]; then
  echo "certbot: PUBLIC_DOMAIN not set — nothing to issue, idling."
  echo "certbot: (self-signed cert from the app container's entrypoint.sh applies instead)"
  # `sleep infinity` support varies by busybox build; a loop is portable.
  while true; do sleep 3600; done
fi

if [ -z "$EMAIL" ]; then
  echo "certbot: WARNING — CERTBOT_EMAIL not set; issuing with --register-unsafely-without-email."
  EMAIL_ARGS="--register-unsafely-without-email"
else
  EMAIL_ARGS="--email $EMAIL"
fi

deploy() {
  if [ -f "$LIVE_DIR/fullchain.pem" ] && [ -f "$LIVE_DIR/privkey.pem" ]; then
    cp "$LIVE_DIR/fullchain.pem" "$DEST_CERT"
    cp "$LIVE_DIR/privkey.pem" "$DEST_KEY"
    echo "certbot: deployed cert for $DOMAIN to $DEST_CERT / $DEST_KEY"
  else
    echo "certbot: WARNING — no cert files found at $LIVE_DIR after issuance/renewal attempt"
  fi
}

# --- Initial issuance ---
# Skipped if a valid cert for this exact domain already exists in the
# persistent certbot_letsencrypt volume (e.g. after a restart). Otherwise
# retry with backoff: on a cold `docker compose up`, this container can win
# the race against the app container's nginx (which must already be
# answering on :80 for the HTTP-01 challenge to succeed) — a few seconds of
# retrying covers that without needing an explicit startup dependency
# between the two (see docker-compose.yml comment on why app doesn't wait
# on certbot).
attempt=0
while [ ! -f "$LIVE_DIR/fullchain.pem" ] && [ "$attempt" -lt 10 ]; do
  attempt=$((attempt + 1))
  echo "certbot: requesting cert for $DOMAIN via HTTP-01 (attempt $attempt/10)"
  if certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
      $EMAIL_ARGS --agree-tos --non-interactive --no-eff-email; then
    break
  fi
  echo "certbot: attempt $attempt failed, retrying in 15s"
  sleep 15
done

if [ ! -f "$LIVE_DIR/fullchain.pem" ]; then
  echo "certbot: WARNING — could not obtain a cert for $DOMAIN after $attempt attempts."
  echo "         app falls back to its self-signed cert; the loop below keeps trying."
fi

deploy

# --- Steady-state loop ---
# certbot's own renew logic no-ops until ~30 days before expiry, so a 12h
# poll is frequent enough without risking Let's Encrypt's rate limits. Also
# retries issuance here in case the initial attempts above all failed (e.g.
# DNS wasn't pointed at this host yet when the stack first came up).
while true
do
  sleep 43200
  if [ -f "$LIVE_DIR/fullchain.pem" ]; then
    echo "certbot: running renew check for $DOMAIN"
    certbot renew --webroot -w "$WEBROOT" || \
      echo "certbot: WARNING — renew check failed, will retry in 12h"
  else
    echo "certbot: still no cert for $DOMAIN — retrying issuance"
    certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
      $EMAIL_ARGS --agree-tos --non-interactive --no-eff-email || \
      echo "certbot: WARNING — issuance retry failed, will retry in 12h"
  fi
  deploy
done
