# MesseBuddy - File Watcher
#
# Long-running container that watches consume-docs for changes and
# updates pgvector embeddings incrementally.
#
# Requires:
#   - vector-db (healthy)       - direct SQL for delete + initial sync query
#   - litellm-pgvector (healthy) - /v1/vector_stores/{id}/embeddings API
#   - litellm (healthy)          - /v1/embeddings API for embedding generation

FROM python:3.13-slim-bookworm

COPY requirements.txt /scripts/requirements.txt
RUN pip install --no-cache-dir -r /scripts/requirements.txt

COPY watcher.py /scripts/watcher.py

CMD ["python3", "/scripts/watcher.py"]
