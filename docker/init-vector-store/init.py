#!/usr/bin/env python3
"""
MesseBuddy - Vector Store Initializer + Document Ingestion

Bootstraps the pgvector vector store, registers it in LiteLLM metadata,
and optionally ingests documents from /consume-docs.

Workaround for LiteLLM bug: https://github.com/BerriAI/litellm/issues/25947

Every step emits [OK] or [FAIL] - no silent failures.
Exits non-zero if a required step fails.
"""

from __future__ import annotations

import hashlib
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

# Both PostgreSQL instances share the same user/password; only DB name differs.
# POSTGRES_USER / POSTGRES_PASSWORD set by docker-compose.yml for litellm-db.
# vector-db reuses those same credentials (POSTGRES_VECTOR_DB is separate).
_POSTGRES_VECTOR_USER = os.getenv("POSTGRES_USER", "litellm")
_POSTGRES_VECTOR_PASSWORD = os.getenv("POSTGRES_PASSWORD", "changeme")
_POSTGRES_VECTOR_DB = os.getenv("POSTGRES_VECTOR_DB", "litellm_vector")
_POSTGRES_VECTOR_HOST = os.getenv("POSTGRES_VECTOR_HOST", "vector-db")
_POSTGRES_VECTOR_PORT = os.getenv("POSTGRES_VECTOR_PORT", "5432")

_LITELLM_DB_USER = os.getenv("POSTGRES_USER", "litellm")
_LITELLM_DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "changeme")
_LITELLM_DB_DB = os.getenv("POSTGRES_DB", "litellm")
_LITELLM_DB_HOST = os.getenv("LITELLM_DB_HOST", "litellm-db")
_LITELLM_DB_PORT = os.getenv("LITELLM_DB_PORT", "5432")

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
    "EMBEDDING_MODEL", "nomic-embed-text-v2-moe"
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

# Front-end virtual key: minted at runtime and written to a shared volume the
# app container reads at startup. Scoped to the chat model + budget-capped so
# it is safe(ish) to expose at the proxy edge.
_RUNTIME_DIR = os.getenv("RUNTIME_DIR", "/runtime")
_VIRTUAL_KEY_ALIAS = os.getenv("VIRTUAL_KEY_ALIAS", "messebuddy-pwa")
_VIRTUAL_KEY_MODELS = [
    m.strip()
    for m in os.getenv("VIRTUAL_KEY_MODELS", "policy-assistant").split(",")
    if m.strip()
]
_VIRTUAL_KEY_BUDGET = float(os.getenv("VIRTUAL_KEY_BUDGET", "5"))

# ── Logging helpers ────────────────────────────────────────────────────────


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def log(msg: str) -> None:
    print(f"[{_ts()}] {msg}", flush=True)


def ok(msg: str) -> None:
    log(f"  ✅  OK  - {msg}")


def warn(msg: str) -> None:
    log(f"  ⚠️  WARN - {msg}")


def fail(msg: str) -> None:
    log(f"  ❌  FAIL - {msg}")
    sys.exit(1)


# ── Health wait utilities ──────────────────────────────────────────────────


def _pg_dsn() -> str:
    return (
        f"dbname={_POSTGRES_VECTOR_DB} user={_POSTGRES_VECTOR_USER}"
        f" password={_POSTGRES_VECTOR_PASSWORD}"
        f" host={_POSTGRES_VECTOR_HOST} port={_POSTGRES_VECTOR_PORT}"
    )


def _litellm_db_dsn() -> str:
    return (
        f"dbname={_LITELLM_DB_DB} user={_LITELLM_DB_USER}"
        f" password={_LITELLM_DB_PASSWORD}"
        f" host={_LITELLM_DB_HOST} port={_LITELLM_DB_PORT}"
    )


def wait_for_postgres() -> None:
    """Wait for PostgreSQL to accept connections via psycopg2."""
    log(f"Step 0: Waiting for PostgreSQL ({_POSTGRES_VECTOR_HOST}:{_POSTGRES_VECTOR_PORT})...")
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
            ok(f"Inserted vector store row - id={row[0]}")
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
            warn(
                "Pgvector connector response does not contain store"
                f" '{_VECTOR_STORE_ID}': {json.dumps(data, indent=2)}"
            )
    except requests.RequestException as exc:
        warn(f"Could not list vector stores from pgvector connector: {exc}")


# ── LiteLLM metadata registration (Admin UI workaround) ────────────────────


def seed_master_key() -> None:
    """Insert master key into LiteLLM's VerificationToken table.

    LiteLLM in database mode does not always auto-seed the master key
    (known issue #9433). Without this, all API calls fail with
    'token_not_found_in_db'. This function inserts the SHA-256 hash
    of the master key directly so register_in_litellm() can authenticate.

    Uses ON CONFLICT DO NOTHING for idempotency.

    On fresh databases, LiteLLM runs async Prisma migrations on boot
    and the healthcheck may pass before tables are created.  This function
    retries for up to _WAIT_TIMEOUT seconds, waiting for the table to
    appear before inserting.
    """
    log("Step 2b: Seeding master key in LiteLLM database...")
    token_hash = hashlib.sha256(_LITELLM_MASTER_KEY.encode()).hexdigest()

    # ── Retry loop: wait until LiteLLM_VerificationToken exists ─────────
    table_ready = False
    elapsed = 0
    while elapsed < _WAIT_TIMEOUT:
        try:
            conn = psycopg2.connect(_litellm_db_dsn())
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM \"LiteLLM_VerificationToken\" LIMIT 0"
            )
            cur.close()
            conn.close()
            table_ready = True
            break
        except psycopg2.Error as exc:
            err_msg = str(exc).strip()
            if elapsed == 0:
                log(
                    f"  LiteLLM DB migrations still in progress "
                    f"({err_msg}) - waiting…"
                )
            time.sleep(_WAIT_INTERVAL)
            elapsed += _WAIT_INTERVAL

    if not table_ready:
        fail(
            f"LiteLLM_VerificationToken table not ready after "
            f"{_WAIT_TIMEOUT}s"
        )

    # ── Insert the master key row ─────────────────────────────────────
    try:
        conn = psycopg2.connect(_litellm_db_dsn())
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
        if row:
            ok(f"Master key seeded - token_hash={token_hash[:16]}...")
        else:
            ok("Master key already exists (idempotent, no action)")
    except Exception as exc:
        fail(f"Could not seed master key in LiteLLM DB: {exc}")


def register_in_litellm() -> None:
    """Register pgvector credentials in LiteLLM via the /credentials API.

    Registers the pgvector connector as a named credential so LiteLLM can
    route vector store operations (search, file upload) to the litellm-pgvector
    service.  The credential appears in the Admin UI at Tools > Vector Stores.

    Uses POST /credentials - idempotent: if the credential already exists
    from a previous run, the API returns 409 and we log a warning instead
    of failing.

    Falls back to direct DB insert only when the Litellm API is unreachable
    or returns an unexpected error, ensuring the vector store is usable at
    query time regardless of Admin UI visibility.
    """
    log("Step 5: Registering pgvector credentials in LiteLLM...")

    pgvector_url = f"http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}"
    litellm_url = f"http://{_LITELLM_HOST}:{_LITELLM_PORT}"

    credential_payload = {
        "credential_name": _VECTOR_STORE_NAME,
        "credential_values": {
            "api_base": pgvector_url,
            "api_key": _LITELLM_MASTER_KEY,
            "custom_llm_provider": "pg_vector",
        },
        "credential_info": {
            "vector_store_name": _VECTOR_STORE_NAME,
            "vector_store_id": _VECTOR_STORE_ID,
            "vector_store_description": (
                "MesseBuddy onboarding and company documents"
            ),
        },
    }

    try:
        resp = requests.post(
            f"{litellm_url}/credentials",
            headers={
                "Authorization": f"Bearer {_LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json=credential_payload,
            timeout=15,
        )
        if resp.status_code == 200:
            body = resp.json()
            if body.get("success") is True:
                ok(
                    f"Credential '{_VECTOR_STORE_NAME}' registered "
                    f"via LiteLLM API"
                )
                return
        # 409 / unique-constraint means the credential already exists
        if resp.status_code == 409 or (
            resp.status_code == 500
            and "unique constraint" in resp.text.lower()
        ):
            ok(
                f"Credential '{_VECTOR_STORE_NAME}' already exists "
                f"(idempotent)"
            )
            return
        warn(
            f"Unexpected response {resp.status_code} from "
            f"/credentials: {resp.text[:300]}"
        )
    except requests.RequestException as exc:
        warn(f"Could not reach LiteLLM /credentials API: {exc}")

    # ── Fallback: direct DB insert into ManagedVectorStoresTable ─────
    log(
        "Step 5-fallback: Inserting managed vector store row directly"
        " (LiteLLM_ManagedVectorStoresTable)..."
    )
    try:
        conn = psycopg2.connect(_litellm_db_dsn())
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
                _VECTOR_STORE_ID,
                "pg_vector",
                _VECTOR_STORE_NAME,
                "MesseBuddy onboarding and company documents",
                _VECTOR_STORE_NAME,
                json.dumps({
                    "vector_store_id": _VECTOR_STORE_ID,
                    "custom_llm_provider": "pg_vector",
                    "api_base": pgvector_url,
                    "api_key": _LITELLM_MASTER_KEY,
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
        if row:
            ok(
                f"Inserted vector store row into"
                f" ManagedVectorStoresTable - id={row[0]}"
            )
        else:
            ok("Vector store row already exists (idempotent)")
    except Exception as exc:
        warn(f"DB fallback also failed: {exc}")
        warn(
            "The store WILL still work at runtime - pgvector tables"
            " (Step 3) are the authoritative source."
        )


# ── LiteLLM managed vector store registration ──────────────────────────────


def register_managed_vector_store() -> None:
    """Register a managed vector store in the LiteLLM proxy.

    This calls POST /vector_stores on the LiteLLM proxy to create a managed
    vector store record.  Unlike /credentials (which only stores credentials),
    this API call populates litellm.vector_store_registry in the proxy's
    in-memory state, which is what enables the RAG pipeline for models that
    have vector_store_ids in their config (e.g. policy-assistant).

    Idempotent: if the store already exists the proxy returns the existing
    record; if the proxy is unreachable we log a warning.
    """
    log("Step 5b: Registering managed vector store in LiteLLM proxy...")

    pgvector_url = f"http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}"
    litellm_url = f"http://{_LITELLM_HOST}:{_LITELLM_PORT}"

    payload = {
        "vector_store_name": _VECTOR_STORE_NAME,
        "litellm_params": {
            "vector_store_id": _VECTOR_STORE_ID,
            "custom_llm_provider": "pg_vector",
            "api_base": pgvector_url,
            "api_key": _LITELLM_MASTER_KEY,
            "vector_store_description": (
                "MesseBuddy onboarding and company documents"
            ),
        },
    }

    try:
        resp = requests.post(
            f"{litellm_url}/vector_stores",
            headers={
                "Authorization": f"Bearer {_LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.status_code == 200:
            body = resp.json()
            store_id = body.get("id", "?")
            ok(f"Managed vector store created - proxy id={store_id}")
            return
        warn(
            f"Unexpected response {resp.status_code} from "
            f"POST /vector_stores: {resp.text[:300]}"
        )
    except requests.RequestException as exc:
        warn(f"Could not reach LiteLLM POST /vector_stores: {exc}")

    # ── Fallback: direct DB insert into ManagedVectorStoresTable ─────
    log(
        "Step 5b-fallback: Inserting managed vector store row directly"
        " (LiteLLM_ManagedVectorStoresTable)..."
    )
    try:
        conn = psycopg2.connect(_litellm_db_dsn())
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
                _VECTOR_STORE_ID,
                "pg_vector",
                _VECTOR_STORE_NAME,
                "MesseBuddy onboarding and company documents",
                _VECTOR_STORE_NAME,
                json.dumps({
                    "vector_store_id": _VECTOR_STORE_ID,
                    "custom_llm_provider": "pg_vector",
                    "api_base": pgvector_url,
                    "api_key": _LITELLM_MASTER_KEY,
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
        if row:
            ok(
                f"Inserted vector store row into"
                f" ManagedVectorStoresTable - id={row[0]}"
            )
        else:
            ok("Vector store row already exists (idempotent)")
    except Exception as exc:
        warn(f"DB fallback also failed: {exc}")
        warn(
            "RAG will NOT be active for the policy-assistant model. "
            "Create the vector store manually in the Admin UI at "
            "Experimental > Vector Stores."
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
            "Step 6: No /consume-docs directory - skipping ingestion"
            f" (looked at {_DOCS_DIR})"
        )
        return

    files_to_process: list[Path] = []
    for ext in _SUPPORTED_EXTENSIONS:
        files_to_process.extend(sorted(docs_path.rglob(f"*{ext}")))

    if not files_to_process:
        log("Step 6: No supported files in /consume-docs - skipping ingestion")
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
        fail("Document ingestion had failures - check logs above")
    else:
        ok("Documents ingested")


# ── Front-end virtual key provisioning ─────────────────────────────────────


def generate_virtual_key() -> None:
    """Mint a scoped, budget-capped virtual key for the PWA and write it to the
    shared runtime volume.

    The app container's entrypoint reads /runtime/virtual_key at startup and
    injects it into the nginx /llm proxy - so the key is created at runtime
    (after the proxy is healthy) rather than baked into the image at build time.

    Idempotency relies on the shared volume persisting alongside the LiteLLM DB:
    if a valid key file already exists, it is reused. On a clean volume (fresh
    `docker compose up --build`) a new key is minted.
    """
    log("Step 7: Provisioning front-end virtual key...")
    litellm_url = f"http://{_LITELLM_HOST}:{_LITELLM_PORT}"
    auth = {"Authorization": f"Bearer {_LITELLM_MASTER_KEY}"}
    key_file = Path(_RUNTIME_DIR) / "virtual_key"

    # Reuse an existing, still-valid key.
    if key_file.is_file():
        existing = key_file.read_text().strip()
        if existing:
            try:
                resp = requests.get(
                    f"{litellm_url}/key/info",
                    headers=auth,
                    params={"key": existing},
                    timeout=10,
                )
                if resp.status_code == 200:
                    ok("Reusing existing virtual key (idempotent)")
                    return
            except requests.RequestException:
                pass
            warn("Existing virtual key invalid - minting a replacement")

    payload = {
        "key_alias": _VIRTUAL_KEY_ALIAS,
        "models": _VIRTUAL_KEY_MODELS,
        "max_budget": _VIRTUAL_KEY_BUDGET,
    }
    try:
        resp = requests.post(
            f"{litellm_url}/key/generate",
            headers={**auth, "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        key = resp.json().get("key")
        if not key:
            fail(f"/key/generate returned no key: {resp.text[:300]}")
        Path(_RUNTIME_DIR).mkdir(parents=True, exist_ok=True)
        key_file.write_text(key)
        ok(
            f"Virtual key provisioned → {key_file} "
            f"(alias={_VIRTUAL_KEY_ALIAS}, models={_VIRTUAL_KEY_MODELS}, "
            f"budget={_VIRTUAL_KEY_BUDGET})"
        )
    except requests.RequestException as exc:
        fail(f"Could not generate virtual key: {exc}")


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

    # Step 2a: Seed master key in LiteLLM database (fixes issue #9433)
    seed_master_key()

    # Step 3: Insert vector store row into pgvector database
    insert_vector_store_row()

    # Step 4: Verify the pgvector connector can see the store
    verify_pgvector_store()

    # Step 5: Register in LiteLLM metadata (Admin UI workaround)
    register_in_litellm()

    # Step 5b: Register managed vector store (enables RAG pipeline)
    register_managed_vector_store()

    # Step 6: Ingest documents (if any)
    ingest_documents()

    # Step 7: Mint the front-end virtual key onto the shared runtime volume
    generate_virtual_key()

    # ── Done ────────────────────────────────────────────────────────────────
    log("=" * 60)
    log("Vector store initialization complete")
    log(f"  Store ID:   {_VECTOR_STORE_ID}")
    log(f"  Store Name: {_VECTOR_STORE_NAME}")
    log(f"  Pgvector:   http://{_PGVECTOR_HOST}:{_PGVECTOR_PORT}")
    log(f"  LiteLLM UI: http://{_LITELLM_HOST}:{_LITELLM_PORT}/ui")
    log("")
    log("=" * 60)


if __name__ == "__main__":
    main()
