# MesseBuddy - File Watcher
#
# Bootstraps the pgvector vector store + LiteLLM registration once, then
# watches consume-docs for changes and updates pgvector embeddings
# incrementally. Also mints the PWA's virtual key (before document
# ingestion, not after) and writes it to the shared /runtime volume.
#
# Requires:
#   - vector-db (healthy)        - direct SQL for bootstrap + delete + sync query
#   - litellm-db (healthy)       - direct SQL for master-key seeding fallback inserts
#   - litellm-pgvector (healthy) - /v1/vector_stores/{id}/embeddings API
#   - litellm (healthy)          - /v1/embeddings, /credentials, /vector_stores, /key/generate
#
# Workaround for LiteLLM bug: https://github.com/BerriAI/litellm/issues/25947

FROM python:3.13-slim-bookworm

COPY requirements.txt /scripts/requirements.txt
RUN pip install --no-cache-dir -r /scripts/requirements.txt

COPY watcher.py /scripts/watcher.py

CMD ["python3", "/scripts/watcher.py"]
