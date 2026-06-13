#!/usr/bin/env python3
"""
MesseBuddy — Document Ingestion Script
=======================================
Reads all supported text files from /docs (mounted from consume-docs/),
splits them into overlapping chunks, embeds each chunk via the OpenAI
Embeddings API, and stores the results in pgvector.

Running this script REPLACES all previously ingested documents.
To update the knowledge base:
    docker compose run --rm ingest

Supported file types: .txt  .md  .rst  .csv
"""

import os
import sys
import time
from pathlib import Path

# ── Third-party (installed by Dockerfile.ingest) ───────────────────────────────
import openai
import psycopg2
from psycopg2.extras import execute_values


# ── Configuration (all overridable via environment variables) ──────────────────
DOCS_DIR        = Path(os.environ.get("DOCS_DIR", "/docs"))
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIM   = int(os.environ.get("EMBEDDING_DIM", "1536"))   # 3-small = 1536
CHUNK_SIZE      = int(os.environ.get("CHUNK_SIZE", "800"))        # characters per chunk
CHUNK_OVERLAP   = int(os.environ.get("CHUNK_OVERLAP", "100"))     # overlap between chunks
EMBED_BATCH     = int(os.environ.get("EMBED_BATCH", "100"))       # embeddings per API call
SUPPORTED_EXTS  = {".txt", ".md", ".rst", ".csv"}

PG_CONN         = os.environ["PGVECTOR_CONNECTION_STRING"]
OPENAI_API_KEY  = os.environ["OPENAI_API_KEY"]


# ── Helpers ────────────────────────────────────────────────────────────────────

def wait_for_postgres(conn_str: str, retries: int = 15, delay: float = 3.0):
    """Block until PostgreSQL is accepting connections."""
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(conn_str)
            print("Connected to pgvector.")
            return conn
        except psycopg2.OperationalError as e:
            print(f"  pgvector not ready (attempt {attempt}/{retries}): {e}")
            time.sleep(delay)
    sys.exit("ERROR: Could not connect to pgvector after multiple retries.")


def chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping character-level chunks.
    Tries to break on newlines to avoid splitting mid-sentence.
    """
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        fragment = text[start:end]
        # Walk back to the last newline to avoid mid-sentence splits
        if end < len(text):
            last_nl = fragment.rfind("\n")
            if last_nl > CHUNK_SIZE // 2:
                fragment = fragment[:last_nl]
        fragment = fragment.strip()
        if fragment:
            chunks.append(fragment)
        start += len(fragment) - CHUNK_OVERLAP
        if start < 0:
            start = 0
    return chunks


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts in one API call."""
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    conn = wait_for_postgres(PG_CONN)
    cur = conn.cursor()

    # Set up pgvector schema
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS doc_chunks (
            id        SERIAL PRIMARY KEY,
            source    TEXT    NOT NULL,
            content   TEXT    NOT NULL,
            embedding VECTOR({EMBEDDING_DIM})
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx "
                "ON doc_chunks USING ivfflat (embedding vector_cosine_ops);")
    # Clear existing data so re-ingestion is idempotent
    cur.execute("TRUNCATE TABLE doc_chunks;")
    conn.commit()
    print("Schema ready. Existing chunks cleared.")

    # Collect files
    text_files = sorted(
        p for p in DOCS_DIR.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
    )
    if not text_files:
        print(f"\nNo documents found in {DOCS_DIR}.")
        print("Drop .txt or .md files into consume-docs/ and re-run:\n"
              "  docker compose run --rm ingest")
        return

    print(f"\nFound {len(text_files)} file(s):")
    for f in text_files:
        print(f"  {f.relative_to(DOCS_DIR)}")

    # Chunk all files
    all_chunks: list[tuple[str, str]] = []   # (source_path, chunk_text)
    for path in text_files:
        source = str(path.relative_to(DOCS_DIR))
        text   = path.read_text(encoding="utf-8", errors="ignore")
        file_chunks = chunk_text(text)
        all_chunks.extend((source, c) for c in file_chunks)
        print(f"  {source}: {len(file_chunks)} chunk(s)")

    print(f"\nEmbedding {len(all_chunks)} chunks (batch size {EMBED_BATCH})...")

    # Embed in batches and insert
    rows: list[tuple[str, str, list[float]]] = []
    for i in range(0, len(all_chunks), EMBED_BATCH):
        batch = all_chunks[i : i + EMBED_BATCH]
        texts = [c[1] for c in batch]
        embeddings = embed_batch(texts)
        for (source, content), emb in zip(batch, embeddings):
            rows.append((source, content, emb))
        done = min(i + EMBED_BATCH, len(all_chunks))
        print(f"  {done}/{len(all_chunks)} chunks embedded")

    execute_values(
        cur,
        "INSERT INTO doc_chunks (source, content, embedding) VALUES %s",
        [(r[0], r[1], r[2]) for r in rows],
        template="(%s, %s, %s::vector)",
    )
    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone. {len(rows)} chunks stored in pgvector.")
    print("The chatbot will answer questions based on these documents only.")


if __name__ == "__main__":
    main()
