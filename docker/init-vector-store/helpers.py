#!/usr/bin/env python3
"""
MesseBuddy - Vector Store Helper Functions

Pure functional operations for vector store initialization, LiteLLM
metadata registration, document ingestion, and virtual key provisioning.

Design principles:
  - All functions take explicit parameters — no environment variable reads.
  - No global state or module-level side effects.
  - Each function is independently testable.
  - Callers (`init.py`) are responsible for config, health waits, and logging.
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any


# ── Document chunking ─────────────────────────────────────────────────────


def chunk_text(
    text: str, max_chars: int = 2000, overlap: int = 200
) -> list[str]:
    """Split text into overlapping chunks at natural boundaries.

    Prefers paragraph breaks (``\\n\\n``), then sentence boundaries
    (``. `` / ``? `` / ``!\\n``), then falls back to word boundaries.
    """
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


# ── Embedding operations ──────────────────────────────────────────────────


def generate_embedding(
    text: str,
    litellm_url: str,
    api_key: str,
    model: str = "nomic-embed-text-v2-moe",
    max_retries: int = 3,
) -> list[float]:
    """Generate an embedding vector via LiteLLM proxy with exponential
    backoff retries.

    Args:
        text: The input text to embed.
        litellm_url: Base URL of the LiteLLM proxy (e.g. ``http://litellm:4000``).
        api_key: LiteLLM master or virtual key for authentication.
        model: Embedding model name registered in LiteLLM config.
        max_retries: Maximum number of retry attempts (default 3).

    Returns:
        A list of floats representing the embedding vector.

    Raises:
        RuntimeError: If all retry attempts fail.
    """
    import requests  # deferred so the module is importable without requests

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
                print(
                    f"  Retry {attempt + 1}/{max_retries} in"
                    f" {wait_sec}s: {exc}"
                )
                time.sleep(wait_sec)
    raise RuntimeError(
        f"Embedding generation failed after {max_retries}"
        f" attempts: {last_error}"
    )


def store_embedding(
    pgvector_url: str,
    api_key: str,
    vector_store_id: str,
    content: str,
    embedding: list[float],
    metadata: dict[str, Any],
    max_retries: int = 3,
) -> str:
    """Store a single embedding chunk in pgvector with exponential backoff.

    Args:
        pgvector_url: Base URL of the litellm-pgvector connector.
        api_key: API key for the pgvector connector.
        vector_store_id: ID of the target vector store.
        content: The chunk text content.
        embedding: The embedding vector (from ``generate_embedding``).
        metadata: Arbitrary metadata dict attached to the embedding.
        max_retries: Maximum number of retry attempts (default 3).

    Returns:
        The embedding ID assigned by pgvector.

    Raises:
        RuntimeError: If all retry attempts fail.
    """
    import requests

    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                f"{pgvector_url}/v1/vector_stores/"
                f"{vector_store_id}/embeddings",
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
                print(
                    f"  Retry {attempt + 1}/{max_retries} in"
                    f" {wait_sec}s: {exc}"
                )
                time.sleep(wait_sec)
    raise RuntimeError(
        f"Embedding storage failed after {max_retries}"
        f" attempts: {last_error}"
    )


# ── pgvector store bootstrap ──────────────────────────────────────────────


def insert_vector_store_row(
    vector_dsn: str,
    vector_store_id: str,
    vector_store_name: str,
) -> str | None:
    """Insert the vector store directly into pgvector's ``vector_stores``
    table. Idempotent via ``ON CONFLICT DO NOTHING``.

    Args:
        vector_dsn: PostgreSQL DSN for the vector-db (key=value format).
        vector_store_id: Unique ID for the vector store.
        vector_store_name: Human-readable name for the vector store.

    Returns:
        The inserted row's ``id`` (str), or ``None`` if the row already
        exists.

    Raises:
        RuntimeError: If the SQL INSERT fails.
    """
    import psycopg2

    try:
        conn = psycopg2.connect(vector_dsn)
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
                vector_store_id,
                vector_store_name,
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
        return row[0] if row else None
    except Exception as exc:
        raise RuntimeError(f"psycopg2 INSERT failed: {exc}") from exc


def verify_pgvector_store(
    pgvector_url: str,
    api_key: str,
    vector_store_id: str,
) -> bool:
    """Verify the pgvector connector lists the store via its API.

    Args:
        pgvector_url: Base URL of the litellm-pgvector connector.
        api_key: API key for the pgvector connector.
        vector_store_id: ID of the vector store to look for.

    Returns:
        ``True`` if the store is listed, ``False`` otherwise.
    """
    import requests

    try:
        resp = requests.get(
            f"{pgvector_url}/v1/vector_stores",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return any(
            s.get("id") == vector_store_id for s in data.get("data", [])
        )
    except requests.RequestException:
        return False


# ── LiteLLM master key seeding ────────────────────────────────────────────


def seed_master_key(
    litellm_dsn: str,
    master_key: str,
    wait_timeout: int = 120,
    wait_interval: int = 3,
) -> bool:
    """Seed the master key into LiteLLM's ``LiteLLM_VerificationToken``
    table.

    LiteLLM in database mode does not always auto-seed the master key
    (known issue #9433).  This function:
      1. Polls until the ``LiteLLM_VerificationToken`` table exists
         (LiteLLM runs async Prisma migrations on boot).
      2. Inserts the SHA-256 hash of the master key.

    Args:
        litellm_dsn: PostgreSQL DSN for the litellm-db.
        master_key: The plaintext master key to seed.
        wait_timeout: Max seconds to wait for the table to appear.
        wait_interval: Seconds between table-existence polls.

    Returns:
        ``True`` if a new row was inserted, ``False`` if it already
        existed (idempotent).

    Raises:
        RuntimeError: If the table does not appear within ``wait_timeout``
            or the INSERT fails.
    """
    import psycopg2

    token_hash = hashlib.sha256(master_key.encode()).hexdigest()

    # ── Wait for the table to exist ─────────────────────────────────────
    table_ready = False
    elapsed = 0
    while elapsed < wait_timeout:
        try:
            conn = psycopg2.connect(litellm_dsn)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(
                'SELECT 1 FROM "LiteLLM_VerificationToken" LIMIT 0'
            )
            cur.close()
            conn.close()
            table_ready = True
            break
        except psycopg2.Error:
            time.sleep(wait_interval)
            elapsed += wait_interval

    if not table_ready:
        raise RuntimeError(
            f"LiteLLM_VerificationToken table not ready after"
            f" {wait_timeout}s"
        )

    # ── Insert the master key row ───────────────────────────────────────
    try:
        conn = psycopg2.connect(litellm_dsn)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO "LiteLLM_VerificationToken"
                (token, user_id, key_alias, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON CONFLICT (token) DO NOTHING
            RETURNING token
            """,
            (token_hash, "default_user_id", "master-key"),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return row is not None
    except Exception as exc:
        raise RuntimeError(
            f"Could not seed master key in LiteLLM DB: {exc}"
        ) from exc


# ── LiteLLM credential registration ──────────────────────────────────────


def register_credential_in_litellm(
    litellm_url: str,
    pgvector_url: str,
    master_key: str,
    vector_store_name: str,
    vector_store_id: str,
    litellm_dsn: str,
) -> str:
    """Register pgvector credentials in LiteLLM via ``POST /credentials``.

    Falls back to a direct DB insert (``LiteLLM_ManagedVectorStoresTable``)
    when the Litellm API is unreachable or returns an unexpected error.

    Args:
        litellm_url: Base URL of the LiteLLM proxy.
        pgvector_url: Base URL of the litellm-pgvector connector.
        master_key: LiteLLM master key for authentication.
        vector_store_name: Human-readable store name.
        vector_store_id: Unique vector store ID.
        litellm_dsn: PostgreSQL DSN for the litellm-db (for fallback insert).

    Returns:
        A status string: ``"api"``, ``"api-idempotent"``,
        ``"db-fallback"``, ``"db-idempotent"``, or ``"unregistered"``.
    """
    import psycopg2
    import requests

    credential_payload = {
        "credential_name": vector_store_name,
        "credential_values": {
            "api_base": pgvector_url,
            "api_key": master_key,
            "custom_llm_provider": "pg_vector",
        },
        "credential_info": {
            "vector_store_name": vector_store_name,
            "vector_store_id": vector_store_id,
            "vector_store_description": (
                "MesseBuddy onboarding and company documents"
            ),
        },
    }

    # ── Attempt LiteLLM API ─────────────────────────────────────────────
    try:
        resp = requests.post(
            f"{litellm_url}/credentials",
            headers={
                "Authorization": f"Bearer {master_key}",
                "Content-Type": "application/json",
            },
            json=credential_payload,
            timeout=15,
        )
        if resp.status_code == 200:
            body = resp.json()
            if body.get("success") is True:
                return "api"
        if resp.status_code == 409 or (
            resp.status_code == 500
            and "unique constraint" in resp.text.lower()
        ):
            return "api-idempotent"
    except requests.RequestException:
        pass

    # ── Fallback: direct DB insert ──────────────────────────────────────
    try:
        conn = psycopg2.connect(litellm_dsn)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO "LiteLLM_ManagedVectorStoresTable"
                (vector_store_id, custom_llm_provider, vector_store_name,
                 vector_store_description, litellm_credential_name,
                 litellm_params, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (vector_store_id) DO UPDATE
            SET litellm_params = EXCLUDED.litellm_params,
                litellm_credential_name = EXCLUDED.litellm_credential_name,
                updated_at = NOW()
            RETURNING vector_store_id
            """,
            (
                vector_store_id,
                "pg_vector",
                vector_store_name,
                "MesseBuddy onboarding and company documents",
                vector_store_name,
                json.dumps({
                    "vector_store_id": vector_store_id,
                    "custom_llm_provider": "pg_vector",
                    "api_base": pgvector_url,
                    "api_key": master_key,
                    "vector_store_description": (
                        "MesseBuddy onboarding and company documents"
                    ),
                }),
            ),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return "db-fallback" if row else "db-idempotent"
    except Exception:
        return "unregistered"


# ── LiteLLM managed vector store registration ─────────────────────────────


def register_managed_vector_store(
    litellm_url: str,
    pgvector_url: str,
    master_key: str,
    vector_store_name: str,
    vector_store_id: str,
    litellm_dsn: str,
) -> str:
    """Register a managed vector store in LiteLLM via ``POST /vector_stores``.

    This populates ``litellm.vector_store_registry`` in the proxy's
    in-memory state, which enables the RAG pipeline for models that
    have ``vector_store_ids`` in their config (e.g. ``policy-assistant``).

    Falls back to a direct DB insert when the API is unreachable.

    Args:
        litellm_url: Base URL of the LiteLLM proxy.
        pgvector_url: Base URL of the litellm-pgvector connector.
        master_key: LiteLLM master key for authentication.
        vector_store_name: Human-readable store name.
        vector_store_id: Unique vector store ID.
        litellm_dsn: PostgreSQL DSN for the litellm-db (for fallback insert).

    Returns:
        A status string: ``"api"``, ``"db-fallback"``,
        ``"db-idempotent"``, or ``"unregistered"``.
    """
    import psycopg2
    import requests

    payload = {
        "vector_store_name": vector_store_name,
        "litellm_params": {
            "vector_store_id": vector_store_id,
            "custom_llm_provider": "pg_vector",
            "api_base": pgvector_url,
            "api_key": master_key,
            "vector_store_description": (
                "MesseBuddy onboarding and company documents"
            ),
        },
    }

    # ── Attempt LiteLLM API ─────────────────────────────────────────────
    try:
        resp = requests.post(
            f"{litellm_url}/vector_stores",
            headers={
                "Authorization": f"Bearer {master_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.status_code == 200:
            return "api"
    except requests.RequestException:
        pass

    # ── Fallback: direct DB insert ──────────────────────────────────────
    try:
        conn = psycopg2.connect(litellm_dsn)
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO "LiteLLM_ManagedVectorStoresTable"
                (vector_store_id, custom_llm_provider, vector_store_name,
                 vector_store_description, litellm_credential_name,
                 litellm_params, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (vector_store_id) DO UPDATE
            SET litellm_params = EXCLUDED.litellm_params,
                litellm_credential_name = EXCLUDED.litellm_credential_name,
                updated_at = NOW()
            RETURNING vector_store_id
            """,
            (
                vector_store_id,
                "pg_vector",
                vector_store_name,
                "MesseBuddy onboarding and company documents",
                vector_store_name,
                json.dumps({
                    "vector_store_id": vector_store_id,
                    "custom_llm_provider": "pg_vector",
                    "api_base": pgvector_url,
                    "api_key": master_key,
                    "vector_store_description": (
                        "MesseBuddy onboarding and company documents"
                    ),
                }),
            ),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return "db-fallback" if row else "db-idempotent"
    except Exception:
        return "unregistered"


# ── Document ingestion pipeline ───────────────────────────────────────────


def ingest_documents(
    docs_dir: str,
    pgvector_url: str,
    litellm_url: str,
    api_key: str,
    vector_store_id: str,
    embedding_model: str = "nomic-embed-text-v2-moe",
    supported_extensions: list[str] | None = None,
    chunk_size: int = 2000,
    overlap: int = 200,
) -> tuple[int, int]:
    """Ingest documents from a directory into the pgvector store.

    For each supported file, the text is chunked, embedded via LiteLLM,
    and stored via the pgvector connector.

    Args:
        docs_dir: Path to the directory containing documents.
        pgvector_url: Base URL of the litellm-pgvector connector.
        litellm_url: Base URL of the LiteLLM proxy.
        api_key: LiteLLM master key for embedding + pgvector calls.
        vector_store_id: ID of the target vector store.
        embedding_model: Embedding model name registered in LiteLLM config.
        supported_extensions: List of file extensions to process (default:
            ``.txt,.md,.csv,.html,.json,.xml,.yaml,.yml``).
        chunk_size: Maximum characters per chunk.
        overlap: Character overlap between consecutive chunks.

    Returns:
        A ``(total_chunks, total_failures)`` tuple.
    """
    if supported_extensions is None:
        supported_extensions = [
            ".txt", ".md", ".csv", ".html",
            ".json", ".xml", ".yaml", ".yml",
        ]

    docs_path = Path(docs_dir)
    if not docs_path.is_dir():
        print(f"  No docs directory at {docs_dir} — skipping ingestion")
        return (0, 0)

    files_to_process: list[Path] = []
    for ext in supported_extensions:
        files_to_process.extend(sorted(docs_path.rglob(f"*{ext}")))

    if not files_to_process:
        print("  No supported files found — skipping ingestion")
        return (0, 0)

    print(f"  Ingesting {len(files_to_process)} document(s)...")
    print(f"  {'Embedding model:':20s} {embedding_model}")
    print(f"  {'Chunk size:':20s} {chunk_size}")
    print(f"  {'Overlap:':20s} {overlap}")
    print()

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

        chunks = chunk_text(text, chunk_size, overlap)
        print(f"    Chunks: {len(chunks)}")

        for i, chunk in enumerate(chunks):
            try:
                embedding = generate_embedding(
                    chunk, litellm_url, api_key, embedding_model
                )
                embed_id = store_embedding(
                    pgvector_url,
                    api_key,
                    vector_store_id,
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
                print(
                    f"      ✅ Chunk {i + 1}/{len(chunks)} → {embed_id}"
                )
            except Exception as exc:
                total_failures += 1
                print(
                    f"      ❌ FAIL Chunk {i + 1}/{len(chunks)}: {exc}"
                )

    print()
    print(f"  Files processed:   {len(files_to_process)}")
    print(f"  Chunks stored:     {total_chunks}")
    print(f"  Failures:          {total_failures}")
    print()

    return (total_chunks, total_failures)


# ── Virtual key provisioning ──────────────────────────────────────────────


def generate_virtual_key(
    litellm_url: str,
    master_key: str,
    key_alias: str = "messebuddy-pwa",
    models: list[str] | None = None,
    max_budget: float = 5.0,
) -> str:
    """Mint a scoped, budget-capped virtual key via ``POST /key/generate``.

    Args:
        litellm_url: Base URL of the LiteLLM proxy.
        master_key: LiteLLM master key for authentication.
        key_alias: Human-readable alias for the key.
        models: List of model names the key is scoped to.
        max_budget: Maximum USD budget for the key.

    Returns:
        The generated key string.

    Raises:
        RuntimeError: If the API call fails or returns no key.
    """
    import requests

    if models is None:
        models = ["policy-assistant"]

    payload = {
        "key_alias": key_alias,
        "models": models,
        "max_budget": max_budget,
    }
    resp = requests.post(
        f"{litellm_url}/key/generate",
        headers={
            "Authorization": f"Bearer {master_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    resp.raise_for_status()
    key: str | None = resp.json().get("key")
    if not key:
        raise RuntimeError(
            f"/key/generate returned no key: {resp.text[:300]}"
        )
    return key
