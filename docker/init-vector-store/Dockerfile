# MesseBuddy — Vector Store Initializer
#
# One-shot container that bootstraps the pgvector vector store and
# registers it in LiteLLM's metadata database.
# Exits after completion — restart: "no" in docker-compose.
#
# Requires:
#   - postgres (healthy)       — for direct SQL insert into pgvector tables
#   - litellm-pgvector (healthy) — via network (document API calls)
#   - litellm (healthy)        — for LiteLLM metadata registration + embeddings
#
# Workaround for LiteLLM bug: https://github.com/BerriAI/litellm/issues/25947

FROM python:3.13-slim-bookworm

# psycopg2-binary bundles its own libpq — no postgresql-client needed
COPY requirements.txt /scripts/requirements.txt
RUN pip install --no-cache-dir -r /scripts/requirements.txt

COPY init.py /scripts/init.py

CMD ["python3", "/scripts/init.py"]
