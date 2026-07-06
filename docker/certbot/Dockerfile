# Thin wrapper around the official certbot image: adds our loop script so the
# container is a persistent service (docker-compose expects long-running
# processes, not one-shot `certbot certonly` invocations).
FROM certbot/certbot:latest

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
