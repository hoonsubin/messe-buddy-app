#!/usr/bin/env python3
"""
MesseBuddy — Vector Store Initializer + Document Ingestion

Bootstraps the pgvector vector store, registers it in LiteLLM metadata,
and optionally ingests documents from /consume-docs.

Workaround for LiteLLM bug: https://github.com/BerriAI/litellm/issues/25947

Every step emits [OK] or [FAIL] — no silent failures.
Exits non-zero if a required step fails.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg2
import requests

# ── Config (overridable via environment) ───────────────────────────────────

_POSTGRES_USER = os.getenv("POSTGRES_USER", "litellm")
_POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "changeme")
_POSTGRES_DB = os.getenv("POSTGRES_DB", "litellm")
_POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
_POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

_PGVECTOR_HOST = os.getenv("PGVECTOR_HOST", "litellm-pgvector")
_PGVECTOR_PORT = os.getenv("PGVECTOR_PORT", "8001")

_LITELLM_HOST = os.getenv("LITELLM_HOST", "litellm")
_LITELLM_PORT = os.getenv("LITELLM_PORT", "4000")
_LITELLM_MASTER_KEY = os.getenv(
    "LITELLM_MASTER_KEY", "sk-dev-change-in-production"
)

_VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "messe-buddy-kb")
_VECTOR_STORE_NAME = os.getenv(
    "VECTOR_STORE_NAME", "messe-buddy-knowledge-base"
)

_EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL", "openai/nomic-embed-text-v2-moe"
)

_WAIT_TIMEOUT = int(os.getenv("WAIT_TIMEOUT", "120"))
_WAIT_INTERVAL = int(os.getenv("WAIT_INTERVAL", "3"))

_DOCS_DIR = os.getenv("DOCS_DIR", "/consume-docs")
_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "2000"))
_OVERLAP = int(os.getenv("OVERLAP", "200"))

_SUPPORTED_EXTENSIONS = os.getenv(
    "SUPPORTED_EXTENSIONS",
    ".txt,.md,.csv,.html,.json,.xml,.yaml,.yml",
).split(",")

# ── Logging helpers ────────────────────────────────────────────────────────


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def log(msg: str) -> None:
    print(f"[{_ts()}] {msg}", flush=True)


def ok(msg: str) -> None:
    log(f"  ✅  OK  — {msg}")


def warn(msg: str) -> None:
    log(f"  ⚠️  WARN — {msg}")


def fail(msg: str) -> None:
    log(f"  ❌  FAIL — {msg}")
    sys.exit(1)


# ── Health wait utilities ──────────────────────────────────────────────────


def _pg_dsn() -> str:
    return (
        f"dbname={_POSTGRES_DB} user={_POSTGRES_USER}"
        f" password={_POSTGRES_PASSWORD}"
        f" host={_POSTGRES_HOST} port={_POSTGRES_PORT}"
    )


def wait_for_postgres() -> None:
    """Wait for PostgreSQL to accept connections via psycopg2."""
    log(f"Step 0: Waiting for PostgreSQL ({_POSTGRES_HOST}:{_POSTGRES_PORT})...")
    elapsed = 0
    while elapsed < _WAIT_TIMEOUT:
        try:
            conn = psycopg2.connect(_pg_dsn())
            conn.close()
            ok(f"PostgreSQL is ready ({elapsed}s)")
            return
        except psycopg2.OperationalError:
            time.sleep(_WAIT_INTERVAL)
            elapsed += _WAIT_INTERVAL
    fail(f"PostgreSQL not ready after {_WAIT_TIMEOUT}s")


def wait_for_http(
    label: str,
    url: str,
    api_key: str | None = None,
    expect_json_status: str | None = None,
) -> None:
    """Wait for an HTTP health endpoint to respond successfully."""
    log(f"Waiting for {label} ({url})...")
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    elapsed = 0
    last_error = ""
    while elapsed < _WAIT_TIMEOUT:
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if expect_json_status:
                body = resp.json()
                if body.get("status") == expect_json_status:
                    ok(f"{label} is healthy ({elapsed}s)")
                    return
                last_error = f"status={body.get('status', '?')}"
            elif resp.ok:
                ok(f"{label} is healthy ({elapsed}s)")
                return
            else:
                last_error = f"HTTP {resp.status_code}"
        except (requests.RequestException, json.JSONDecodeError) as exc:
            last_error = str(exc)
        time.sleep(_WAIT_INTERVAL)
        elapsed += _WAIT_INTERVAL
    extra = f" (last: {last_error})" if last_error else ""
    fail(f"{label} not healthy after {_WAIT_TIMEOUT}s{extra}")


# ── pgvector bootstrap ─────────────────────────────────────────────────────


def insert_vector_store_row() -> None:
    """Insert the vector store directly into pgvector's vector_stores table.

    Uses ON CONFLICT DO NOTHING for idempotency.
    """
    log(
        f"Step 3: Creating vector store '{_VECTOR_STORE_ID}' "
        f"in pgvector tables..."
    )
    try:
        conn = psycopg2.connect(_pg_dsn())
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO vector_stores
                (id, name, file_counts, status, usage_bytes, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING id
            """,
            (
                _VECTOR_STORE_ID,
                _VECTOR_STORE_NAME,
                json.dumps({
                    "in_progress": 0,
                    "completed": 0,
                    "failed": 0,
                    "cancelled": 0,
                    "total": 0,
                }),
                "completed",
                0,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if row:
            ok(f"Inserted vector store row — id={row[0]}")
        else:
            warn(
                f"Row already exists for vector_store_id='{_VECTOR_STORE_ID}'"
                " (idempotent, no action taken)"
            )
    except Exception as exc:
        fail(f"psycopg2 INSERT failed: {exc}")


def verify_pgvector_store() -> None:
    """Verify the pgvector connector lists the store via its API."""
    log("Step 4: Verifying pgvector connector lists the store...")
    pgvector_url = f"http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}"
    try:
        resp = requests.get(
            f"{pgvector_url}/v1/vector_stores",
            headers={"Authorization": f"Bearer {_LITELLM_MASTER_KEY}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        found = any(
            s.get("id") == _VECTOR_STORE_ID for s in data.get("data", [])
        )
        if found:
            ok(f"Pgvector connector lists vector store '{_VECTOR_STORE_ID}'")
        else:
            fail(
                "Pgvector connector response does not contain store"
                f" '{_VECTOR_STORE_ID}': {json.dumps(data, indent=2)}"
            )
    except requests.RequestException as exc:
        fail(f"Could not list vector stores from pgvector connector: {exc}")


# ── LiteLLM metadata registration (Admin UI workaround) ────────────────────


def register_in_litellm() -> None:
    """Register vector store in LiteLLM metadata via POST /v1/vector_stores.

    Due to LiteLLM bug #25947, config-file vector stores don't appear in
    the Admin UI. This API call persists the store to LiteLLM's own
    metadata tables.

    This step does NOT fail on non-200 responses — the pgvector tables
    (Step 3) are the authoritative source for RAG lookups.
    """
    log("Step 5: Registering vector store in LiteLLM metadata (Admin UI)...")
    litellm_url = f"http://{_LITELLM_HOST}:{_LITELLM_PORT}"
    try:
        resp = requests.post(
            f"{litellm_url}/v1/vector_stores",
            headers={
                "Authorization": f"Bearer {_LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json={"name": _VECTOR_STORE_NAME},
            timeout=15,
        )
    except requests.RequestException as exc:
        warn(f"LiteLLM unreachable: {exc}")
        warn(
            "The store WILL still work at runtime — pgvector tables"
            " (Step 3) are the authoritative source."
        )
        return

    http_code = resp.status_code
    try:
        body = resp.json()
    except Exception:
        body = resp.text

    if http_code == 200:
        store_id = body.get("id", "unknown") if isinstance(body, dict) else "unknown"
        ok(f"Registered in LiteLLM metadata — id={store_id}")
    elif http_code == 409:
        warn(
            "LiteLLM returned 409 (Conflict) — store may already be"
            " registered (idempotent, no action needed)"
        )
    elif http_code == 400:
        warn(f"LiteLLM returned 400 (Bad Request): {body}")
        warn(
            "This is EXPECTED if LiteLLM deduplicates by name."
            " The store is still usable via config.yaml."
        )
    else:
        warn(f"LiteLLM returned HTTP {http_code}: {body}")
        warn(
            "Reason: LiteLLM bug #25947 — config-file vector stores may"
            " not appear in Admin UI. The pgvector tables (Step 3) are"
            " the authoritative source for RAG lookups."
        )


# ── Document ingestion ─────────────────────────────────────────────────────


def chunk_text(text: str, max_chars: int = 2000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks at natural boundaries."""
    chunks: list[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + max_chars, text_len)

        if end < text_len:
            para_break = text.rfind("\n\n", start, end)
            if para_break > start + max_chars // 2:
                end = para_break + 2
            else:
                sent_break = max(
                    text.rfind(". ", start, end),
                    text.rfind(".\n", start, end),
                    text.rfind("? ", start, end),
                    text.rfind("!\n", start, end),
                )
                if sent_break > start + max_chars // 2:
                    end = sent_break + 1
                else:
                    space = text.rfind(" ", start, end)
                    if space > start + max_chars // 2:
                        end = space

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap if end < text_len else text_len

    return chunks


def _generate_embedding(
    text: str,
    litellm_url: str,
    api_key: str,
    model: str = _EMBEDDING_MODEL,
    max_retries: int = 3,
) -> list[float]:
    """Generate an embedding vector via LiteLLM proxy with retries."""
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                f"{litellm_url}/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "input": [text]},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
        except requests.RequestException as exc:
            last_error = exc
            if attempt < max_retries - 1:
                wait_sec = 2**attempt
                print(f"  Retry {attempt + 1}/{max_retries} in {wait_sec}s: {exc}")
                time.sleep(wait_sec)
    raise RuntimeError(
        f"Embedding generation failed after {max_retries} attempts: {last_error}"
    )


def _store_embedding(
    pgvector_url: str,
    api_key: str,
    vector_store_id: str,
    content: str,
    embedding: list[float],
    metadata: dict[str, Any],
    max_retries: int = 3,
) -> str:
    """Store a single embedding in pgvector with retries."""
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                f"{pgvector_url}/v1/vector_stores/{vector_store_id}/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "content": content,
                    "embedding": embedding,
                    "metadata": metadata,
                },
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["id"]
        except requests.RequestException as exc:
            last_error = exc
            if attempt < max_retries - 1:
                wait_sec = 2**attempt
                print(f"  Retry {attempt + 1}/{max_retries} in {wait_sec}s: {exc}")
                time.sleep(wait_sec)
    raise RuntimeError(
        f"Embedding storage failed after {max_retries} attempts: {last_error}"
    )


def ingest_documents() -> None:
    """Ingest documents from /consume-docs into the pgvector store."""
    docs_path = Path(_DOCS_DIR)
    if not docs_path.is_dir():
        log(
            "Step 6: No /consume-docs directory — skipping ingestion"
            f" (looked at {_DOCS_DIR})"
        )
        return

    files_to_process: list[Path] = []
    for ext in _SUPPORTED_EXTENSIONS:
        files_to_process.extend(sorted(docs_path.rglob(f"*{ext}")))

    if not files_to_process:
        log("Step 6: No supported files in /consume-docs — skipping ingestion")
        return

    log(f"Step 6: Ingesting {len(files_to_process)} document(s)...")
    print(f"  {'Embedding model:':20s} {_EMBEDDING_MODEL}")
    print(f"  {'Chunk size:':20s} {_CHUNK_SIZE}")
    print(f"  {'Overlap:':20s} {_OVERLAP}")
    print()

    pgvector_url = f"http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}"
    litellm_url = f"http://{_LITELLM_HOST}:{_LITELLM_PORT}"

    total_chunks = 0
    total_failures = 0

    for file_path in files_to_process:
        rel_path = str(file_path.relative_to(docs_path))
        print(f"  📄 {rel_path}")

        try:
            text = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                text = file_path.read_text(encoding="latin-1")
            except Exception as exc:
                print(f"    ⚠️  SKIP: Could not read file: {exc}")
                total_failures += 1
                continue

        if not text.strip():
            print("    ⚠️  SKIP: Empty file")
            continue

        chunks = chunk_text(text, _CHUNK_SIZE, _OVERLAP)
        print(f"    Chunks: {len(chunks)}")

        for i, chunk in enumerate(chunks):
            try:
                embedding = _generate_embedding(
                    chunk, litellm_url, _LITELLM_MASTER_KEY, _EMBEDDING_MODEL
                )
                embed_id = _store_embedding(
                    pgvector_url,
                    _LITELLM_MASTER_KEY,
                    _VECTOR_STORE_ID,
                    chunk,
                    embedding,
                    metadata={
                        "filename": file_path.name,
                        "relative_path": rel_path,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "source": "consume-docs",
                    },
                )
                total_chunks += 1
                print(f"      ✅ Chunk {i + 1}/{len(chunks)} → {embed_id}")
            except Exception as exc:
                total_failures += 1
                print(f"      ❌ FAIL Chunk {i + 1}/{len(chunks)}: {exc}")

    print()
    print(f"  Files processed:   {len(files_to_process)}")
    print(f"  Chunks stored:     {total_chunks}")
    print(f"  Failures:          {total_failures}")
    print()

    if total_failures > 0:
        fail("Document ingestion had failures — check logs above")
    else:
        ok("Documents ingested")


# ── Main ───────────────────────────────────────────────────────────────────


def main() -> None:
    log("=== MesseBuddy Vector Store Initializer ===")

    # Step 0: Wait for PostgreSQL
    wait_for_postgres()

    # Step 1: Wait for pgvector connector
    wait_for_http(
        "pgvector connector",
        f"http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}/health",
    )

    # Step 2: Wait for LiteLLM proxy (with readiness check)
    wait_for_http(
        "LiteLLM proxy",
        f"http://{_LITELLM_HOST}:{_LITELLM_PORT}/health/readiness",
        api_key=_LITELLM_MASTER_KEY,
        expect_json_status="healthy",
    )

    # Step 3: Insert vector store row into pgvector database
    insert_vector_store_row()

    # Step 4: Verify the pgvector connector can see the store
    verify_pgvector_store()

    # Step 5: Register in LiteLLM metadata (Admin UI workaround)
    register_in_litellm()

    # Step 6: Ingest documents (if any)
    ingest_documents()

    # ── Done ────────────────────────────────────────────────────────────────
    log("=" * 60)
    log("Vector store initialization complete")
    log(f"  Store ID:   {_VECTOR_STORE_ID}")
    log(f"  Store Name: {_VECTOR_STORE_NAME}")
    log(f"  Pgvector:   http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}")
    log(f"  LiteLLM UI: http://{_LITELLM_HOST}:{_LITELLM_PORT}/ui")
    log("")
    log(
        "NOTE: Due to LiteLLM issue #25947, the vector store may not"
        " appear in the Admin UI at Tools > Vector Stores. The store IS"
        " functional — RAG lookups from the 'policy-assistant' model"
        " will query pgvector correctly."
    )
    log("=" * 60)


if __name__ == "__main__":
    main()
