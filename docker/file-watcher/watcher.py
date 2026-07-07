#!/usr/bin/env python3
"""
MesseBuddy - File Watcher

Bootstraps the pgvector vector store + LiteLLM registration once, then
watches ``consume-docs`` for file create / modify / delete events and
updates pgvector embeddings incrementally. Absorbs what used to be the
separate one-shot ``init-vector-store`` container — there's no longer a
reason to ship bootstrap and ingestion as two containers duplicating the
same chunking/embedding code.

Design:
  - Bootstrap on startup (idempotent): seed the LiteLLM master key, create
    the vector store row, register it with LiteLLM, and mint the PWA's
    virtual key — in that order, and deliberately *before* document
    ingestion. The virtual key only depends on the vector store being
    registered, not on documents actually being embedded, so minting it
    first means the web app can go live almost immediately instead of
    waiting out however long ingestion takes.
  - Initial sync: compares disk state against the vector store, re-ingests
    changed files, removes orphaned embeddings.
  - Long-running filesystem watch via ``watchdog`` with debounce.
  - Embedding generation goes through LiteLLM (``/v1/embeddings``).
  - Embedding storage goes through the pgvector connector
    (``POST /v1/vector_stores/{id}/embeddings``).
  - Embedding deletion uses direct SQL (psycopg2) to avoid adding a DELETE
    endpoint to the pgvector connector.

Content-hash tracking:
  Each embedding carries ``metadata.content_hash`` — an SHA-256 of the
  *full file content* (same for all chunks of a file).  This lets the
  watcher skip unchanged files after a restart.
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
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration — read once from environment
# ═══════════════════════════════════════════════════════════════════════════════

POSTGRES_USER = os.getenv("POSTGRES_USER", "litellm")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "changeme")

POSTGRES_VECTOR_DB = os.getenv("POSTGRES_VECTOR_DB", "litellm_vector")
POSTGRES_VECTOR_HOST = os.getenv("POSTGRES_VECTOR_HOST", "vector-db")
POSTGRES_VECTOR_PORT = os.getenv("POSTGRES_VECTOR_PORT", "5432")

LITELLM_DB_DB = os.getenv("POSTGRES_DB", "litellm")
LITELLM_DB_HOST = os.getenv("LITELLM_DB_HOST", "litellm-db")
LITELLM_DB_PORT = os.getenv("LITELLM_DB_PORT", "5432")

PGVECTOR_HOST = os.getenv("PGVECTOR_HOST", "litellm-pgvector")
PGVECTOR_PORT = os.getenv("PGVECTOR_PORT", "8001")

LITELLM_HOST = os.getenv("LITELLM_HOST", "litellm")
LITELLM_PORT = os.getenv("LITELLM_PORT", "4000")

LITELLM_MASTER_KEY = os.getenv(
    "LITELLM_MASTER_KEY", "sk-dev-change-in-production"
)

VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "messe-buddy-kb")
VECTOR_STORE_NAME = os.getenv(
    "VECTOR_STORE_NAME", "messe-buddy-knowledge-base"
)
DOCS_DIR = os.getenv("DOCS_DIR", "/consume-docs")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1500"))
OVERLAP = int(os.getenv("OVERLAP", "150"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2")
# Must match the pgvector column's fixed dimension (see
# docker/litellm-pgvector/prisma/schema.prisma) — without sending this as
# `dimensions` on the /v1/embeddings request, Gemini (and most MRL-trained
# embedding models) returns its native full-size vector regardless of what's
# set here, and the pgvector INSERT below fails with a dimension mismatch.
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))

SUPPORTED_EXTENSIONS = tuple(
    os.getenv(
        "SUPPORTED_EXTENSIONS",
        ".txt,.md,.csv,.html,.json,.xml,.yaml,.yml",
    ).split(",")
)

WAIT_TIMEOUT = int(os.getenv("WAIT_TIMEOUT", "120"))
WAIT_INTERVAL = int(os.getenv("WAIT_INTERVAL", "3"))
DEBOUNCE_SECONDS = float(os.getenv("DEBOUNCE_SECONDS", "2.0"))

# -- Virtual key (minted for the PWA, written to a shared volume) --
RUNTIME_DIR = os.getenv("RUNTIME_DIR", "/runtime")
VIRTUAL_KEY_ALIAS = os.getenv("VIRTUAL_KEY_ALIAS", "messebuddy-pwa")
VIRTUAL_KEY_MODELS = [
    m.strip()
    for m in os.getenv("VIRTUAL_KEY_MODELS", "policy-assistant").split(",")
    if m.strip()
]
VIRTUAL_KEY_BUDGET = float(os.getenv("VIRTUAL_KEY_BUDGET", "5"))

# Derived — computed once at module load
_VECTOR_DSN = (
    f"dbname={POSTGRES_VECTOR_DB} user={POSTGRES_USER}"
    f" password={POSTGRES_PASSWORD}"
    f" host={POSTGRES_VECTOR_HOST} port={POSTGRES_VECTOR_PORT}"
)

_LITELLM_DSN = (
    f"dbname={LITELLM_DB_DB} user={POSTGRES_USER}"
    f" password={POSTGRES_PASSWORD}"
    f" host={LITELLM_DB_HOST} port={LITELLM_DB_PORT}"
)

_PGVECTOR_URL = f"http://{PGVECTOR_HOST}:{PGVECTOR_PORT}"
_LITELLM_URL = f"http://{LITELLM_HOST}:{LITELLM_PORT}"


# ═══════════════════════════════════════════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════════════════════════════════════════


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


def log(msg: str) -> None:
    print(f"[{_ts()}] {msg}", flush=True)


# ═══════════════════════════════════════════════════════════════════════════════
# Health-wait utilities
# ═══════════════════════════════════════════════════════════════════════════════


def wait_for_postgres() -> None:
    """Poll vector-db until it accepts connections."""
    log(
        f"Waiting for PostgreSQL"
        f" ({POSTGRES_VECTOR_HOST}:{POSTGRES_VECTOR_PORT})..."
    )
    elapsed = 0
    while elapsed < WAIT_TIMEOUT:
        try:
            conn = psycopg2.connect(_VECTOR_DSN)
            conn.close()
            log(f"  ✅ PostgreSQL is ready ({elapsed}s)")
            return
        except psycopg2.OperationalError:
            time.sleep(WAIT_INTERVAL)
            elapsed += WAIT_INTERVAL
    log(f"  ❌ PostgreSQL not ready after {WAIT_TIMEOUT}s")
    sys.exit(1)


def wait_for_http(label: str, url: str) -> None:
    """Poll an HTTP health endpoint."""
    log(f"Waiting for {label} ({url})...")
    elapsed = 0
    while elapsed < WAIT_TIMEOUT:
        try:
            resp = requests.get(url, timeout=5)
            if resp.ok:
                log(f"  ✅ {label} is healthy ({elapsed}s)")
                return
        except requests.RequestException:
            pass
        time.sleep(WAIT_INTERVAL)
        elapsed += WAIT_INTERVAL
    log(f"  ❌ {label} not healthy after {WAIT_TIMEOUT}s")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# Bootstrap — runs once at startup, before initial sync. Ported from the old
# init-vector-store container; kept idempotent so it's safe to re-run on
# every restart (ON CONFLICT DO NOTHING / existing-row checks throughout).
# ═══════════════════════════════════════════════════════════════════════════════


def seed_master_key() -> None:
    """Seed LITELLM_MASTER_KEY into LiteLLM's ``LiteLLM_VerificationToken``
    table. LiteLLM in database mode does not always auto-seed the master
    key (known issue #9433); subsequent API calls (credentials, vector
    store registration, key/generate) need it to already exist.
    """
    token_hash = hashlib.sha256(LITELLM_MASTER_KEY.encode()).hexdigest()

    table_ready = False
    elapsed = 0
    while elapsed < WAIT_TIMEOUT:
        try:
            conn = psycopg2.connect(_LITELLM_DSN)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute('SELECT 1 FROM "LiteLLM_VerificationToken" LIMIT 0')
            cur.close()
            conn.close()
            table_ready = True
            break
        except psycopg2.Error:
            time.sleep(WAIT_INTERVAL)
            elapsed += WAIT_INTERVAL

    if not table_ready:
        log(f"  ❌ LiteLLM_VerificationToken table not ready after {WAIT_TIMEOUT}s")
        sys.exit(1)

    try:
        conn = psycopg2.connect(_LITELLM_DSN)
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
        log("  ✅ Master key seeded" if row else "  ✅ Master key already seeded (idempotent)")
    except Exception as exc:
        log(f"  ❌ Could not seed master key in LiteLLM DB: {exc}")
        sys.exit(1)


def insert_vector_store_row() -> None:
    """Insert the vector store directly into pgvector's ``vector_stores``
    table. Idempotent via ``ON CONFLICT DO NOTHING``."""
    try:
        conn = psycopg2.connect(_VECTOR_DSN)
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
                VECTOR_STORE_ID,
                VECTOR_STORE_NAME,
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
        log(
            f"  ✅ Inserted vector store row — id={row[0]}"
            if row
            else "  ✅ Vector store row already exists (idempotent)"
        )
    except Exception as exc:
        log(f"  ❌ psycopg2 INSERT failed: {exc}")
        sys.exit(1)


def _report_registration_status(step_label: str, status: str) -> None:
    if status in ("api", "db-fallback"):
        log(f"  ✅ {step_label}: registered ({status})")
    elif status in ("api-idempotent", "db-idempotent"):
        log(f"  ✅ {step_label}: already registered (idempotent)")
    else:  # "unregistered"
        log(
            f"  ⚠️  {step_label}: DB fallback also failed. RAG will NOT be"
            " active for the policy-assistant model. Create the vector"
            " store manually in the Admin UI at Experimental > Vector Stores."
        )


def register_credential_in_litellm() -> None:
    """Register pgvector credentials in LiteLLM via ``POST /credentials``,
    falling back to a direct DB insert if the API is unreachable."""
    credential_payload = {
        "credential_name": VECTOR_STORE_NAME,
        "credential_values": {
            "api_base": _PGVECTOR_URL,
            "api_key": LITELLM_MASTER_KEY,
            "custom_llm_provider": "pg_vector",
        },
        "credential_info": {
            "vector_store_name": VECTOR_STORE_NAME,
            "vector_store_id": VECTOR_STORE_ID,
            "vector_store_description": (
                "MesseBuddy onboarding and company documents"
            ),
        },
    }

    try:
        resp = requests.post(
            f"{_LITELLM_URL}/credentials",
            headers={
                "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json=credential_payload,
            timeout=15,
        )
        if resp.status_code == 200 and resp.json().get("success") is True:
            _report_registration_status("Register credential", "api")
            return
        if resp.status_code == 409 or (
            resp.status_code == 500 and "unique constraint" in resp.text.lower()
        ):
            _report_registration_status("Register credential", "api-idempotent")
            return
    except requests.RequestException:
        pass

    status = _insert_managed_vector_store_row()
    _report_registration_status("Register credential", status)


def register_managed_vector_store() -> None:
    """Register a managed vector store in LiteLLM via ``POST /vector_stores``,
    populating the proxy's ``vector_store_registry`` in-memory state, which
    is what actually enables RAG for models with ``vector_store_ids`` set.
    Falls back to a direct DB insert if the API is unreachable."""
    payload = {
        "vector_store_name": VECTOR_STORE_NAME,
        "litellm_params": {
            "vector_store_id": VECTOR_STORE_ID,
            "custom_llm_provider": "pg_vector",
            "api_base": _PGVECTOR_URL,
            "api_key": LITELLM_MASTER_KEY,
            "vector_store_description": (
                "MesseBuddy onboarding and company documents"
            ),
        },
    }

    try:
        resp = requests.post(
            f"{_LITELLM_URL}/vector_stores",
            headers={
                "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if resp.status_code == 200:
            _report_registration_status("Register vector store", "api")
            return
    except requests.RequestException:
        pass

    status = _insert_managed_vector_store_row()
    _report_registration_status("Register vector store", status)


def _insert_managed_vector_store_row() -> str:
    """Shared DB-fallback insert used by both registration steps above."""
    try:
        conn = psycopg2.connect(_LITELLM_DSN)
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
                VECTOR_STORE_ID,
                "pg_vector",
                VECTOR_STORE_NAME,
                "MesseBuddy onboarding and company documents",
                VECTOR_STORE_NAME,
                json.dumps({
                    "vector_store_id": VECTOR_STORE_ID,
                    "custom_llm_provider": "pg_vector",
                    "api_base": _PGVECTOR_URL,
                    "api_key": LITELLM_MASTER_KEY,
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


def _delete_existing_virtual_key(alias: str) -> None:
    """Delete any LiteLLM-side key already registered under ``alias`` before
    minting a fresh one.

    Without this, redeploying WITHOUT wiping litellm_db_data (e.g. a plain
    restart, or `docker compose build --no-cache` followed by `up`, with no
    `-v`) hits LiteLLM's unique-key_alias constraint on the very next
    `/key/generate` call — "Key with alias 'messebuddy-pwa' already exists" —
    because the DB-side key row from the previous boot is still there even
    though the local /runtime/virtual_key file (deleted below) is not. That
    error is unhandled by the caller, so the watcher container exits and
    crash-loops under `restart: unless-stopped` until someone notices the
    virtual key never lands and the chat feature silently has no auth.

    `key_aliases` is a supported filter on POST /key/delete (added upstream
    specifically for this alias-based cleanup use case), so this is a single
    call — no need to /key/list and match tokens by hand. Best-effort: if
    LiteLLM is an old build without `key_aliases` support, or there's simply
    nothing to delete, this logs and moves on; /key/generate below is the
    step that actually matters and still fails loudly if something's wrong.
    """
    try:
        resp = requests.post(
            f"{_LITELLM_URL}/key/delete",
            headers={
                "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json={"key_aliases": [alias]},
            timeout=15,
        )
        if resp.ok:
            log(f"  🗑️  Cleared any existing LiteLLM key(s) with alias '{alias}'")
        else:
            log(
                f"  ⚠️  /key/delete for alias '{alias}' returned"
                f" {resp.status_code}: {resp.text[:200]}"
                " (continuing — /key/generate below will surface any real problem)"
            )
    except requests.RequestException as exc:
        log(
            f"  ⚠️  Could not reach LiteLLM to clear alias '{alias}': {exc}"
            " (continuing — /key/generate below will surface any real problem)"
        )


def provision_virtual_key() -> None:
    """Mint the front-end virtual key and persist it to the shared
    /runtime volume for the app container's entrypoint to pick up.

    The virtual key is ephemeral by design — a fresh one is generated on
    every bootstrap. This avoids stale keys surviving `docker compose
    down -v` (where the virtual_key file on the app_runtime volume may
    outlive the LiteLLM DB that held its auth record)."""
    key_file = Path(RUNTIME_DIR) / "virtual_key"

    # Always delete any stale key first — entrypoint.sh does the same
    # on its side, but this ensures we never reuse a cached key even if
    # the watcher restarts independently of the app container.
    if key_file.is_file():
        key_file.unlink()
        log("  🗑️  Removed stale virtual key file")

    # And clear any LiteLLM-side key under this alias from a previous boot —
    # see _delete_existing_virtual_key's docstring for why the file removal
    # above isn't enough on its own.
    _delete_existing_virtual_key(VIRTUAL_KEY_ALIAS)

    try:
        resp = requests.post(
            f"{_LITELLM_URL}/key/generate",
            headers={
                "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "key_alias": VIRTUAL_KEY_ALIAS,
                "models": VIRTUAL_KEY_MODELS,
                "max_budget": VIRTUAL_KEY_BUDGET,
            },
            timeout=15,
        )
        resp.raise_for_status()
        key = resp.json().get("key")
        if not key:
            raise RuntimeError(f"/key/generate returned no key: {resp.text[:300]}")
        Path(RUNTIME_DIR).mkdir(parents=True, exist_ok=True)
        key_file.write_text(key)
        log(
            f"  ✅ Virtual key provisioned → {key_file} (alias={VIRTUAL_KEY_ALIAS},"
            f" models={VIRTUAL_KEY_MODELS}, budget={VIRTUAL_KEY_BUDGET})"
        )
    except (requests.RequestException, RuntimeError) as exc:
        log(f"  ❌ Could not generate virtual key: {exc}")
        sys.exit(1)


def bootstrap() -> None:
    """Run the one-time setup pipeline. Order matters: the virtual key only
    needs the vector store to be registered, not for documents to actually
    be embedded — minting it before ingestion (not after) is what lets the
    web app go live immediately instead of waiting out ingestion."""
    log("=== Bootstrap ===")
    log("Seeding LiteLLM master key...")
    seed_master_key()
    log(f"Creating vector store '{VECTOR_STORE_ID}'...")
    insert_vector_store_row()
    log("Registering pgvector credential in LiteLLM...")
    register_credential_in_litellm()
    log("Registering managed vector store in LiteLLM...")
    register_managed_vector_store()
    log("Provisioning front-end virtual key...")
    provision_virtual_key()
    log("=== Bootstrap complete ===\n")


# ═══════════════════════════════════════════════════════════════════════════════
# Content hashing
# ═══════════════════════════════════════════════════════════════════════════════


def compute_file_hash(file_path: Path) -> str:
    """SHA-256 of the full file content."""
    return hashlib.sha256(file_path.read_bytes()).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# Text chunking — adapted from helpers.py to avoid cross-container coupling
# ═══════════════════════════════════════════════════════════════════════════════


def chunk_text(
    text: str, max_chars: int = 2000, overlap: int = 200
) -> list[str]:
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


# ═══════════════════════════════════════════════════════════════════════════════
# Embedding operations
# ═══════════════════════════════════════════════════════════════════════════════


class EmbeddingTooLargeError(RuntimeError):
    """Raised when the embedding server rejects input as exceeding its
    context window. Distinct from transient RequestExceptions: retrying
    the same input is pointless — the caller must split it instead.
    """


def _is_too_large_response(status_code: int, body_text: str) -> bool:
    if status_code < 400:
        return False
    lowered = body_text.lower()
    return "too large to process" in lowered or "physical batch size" in lowered


def generate_embedding(text: str, max_retries: int = 3) -> list[float]:
    """Generate an embedding vector via LiteLLM proxy with exponential backoff.

    Raises EmbeddingTooLargeError (not retried) if the input exceeds the
    embedding server's context window — the caller should split the text.
    """
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                f"{_LITELLM_URL}/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": EMBEDDING_MODEL,
                    "input": [text],
                    "dimensions": EMBEDDING_DIM,
                },
                timeout=60,
            )
            if _is_too_large_response(resp.status_code, resp.text):
                raise EmbeddingTooLargeError(resp.text[:300])
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
        except EmbeddingTooLargeError:
            raise
        except requests.RequestException as exc:
            last_error = exc
            if attempt < max_retries - 1:
                wait_sec = 2**attempt
                log(f"  Retry {attempt + 1}/{max_retries} in {wait_sec}s: {exc}")
                time.sleep(wait_sec)
    raise RuntimeError(
        f"Embedding generation failed after {max_retries}"
        f" attempts: {last_error}"
    )


def _split_in_half(text: str) -> tuple[str, str]:
    """Split text into two roughly-equal halves at the nearest word
    boundary, so a re-split chunk doesn't sever a word mid-token."""
    mid = len(text) // 2
    split_at = text.rfind(" ", 0, mid)
    if split_at <= 0:
        split_at = mid
    return text[:split_at].strip(), text[split_at:].strip()


def generate_embedding_auto_split(
    text: str, max_retries: int = 3, _max_depth: int = 6
) -> list[tuple[str, list[float]]]:
    """Generate an embedding for text, bisecting and retrying if the
    embedding server rejects it as exceeding its context window.

    Char-based chunking can't guarantee a token ceiling — token density
    varies by content, so any fixed chunk size will eventually overflow on
    sufficiently dense text. This makes ingestion self-correcting instead:
    on overflow, split the chunk in half and recurse until every piece
    actually fits, rather than guessing a smaller fixed size.

    Returns a list of (text_piece, embedding) pairs — usually one pair,
    more if splitting was needed.
    """
    try:
        return [(text, generate_embedding(text, max_retries))]
    except EmbeddingTooLargeError:
        if _max_depth <= 0:
            raise
        left, right = _split_in_half(text)
        if not left or not right:
            raise
        return generate_embedding_auto_split(
            left, max_retries, _max_depth - 1
        ) + generate_embedding_auto_split(right, max_retries, _max_depth - 1)


def store_embedding(
    content: str,
    embedding: list[float],
    metadata: dict[str, Any],
    max_retries: int = 3,
) -> str:
    """Store a single embedding chunk via the pgvector connector."""
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                f"{_PGVECTOR_URL}/v1/vector_stores/"
                f"{VECTOR_STORE_ID}/embeddings",
                headers={
                    "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
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
                log(f"  Retry {attempt + 1}/{max_retries} in {wait_sec}s: {exc}")
                time.sleep(wait_sec)
    raise RuntimeError(
        f"Embedding storage failed after {max_retries}"
        f" attempts: {last_error}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Direct SQL operations (for delete — no pgvector connector DELETE endpoint)
# ═══════════════════════════════════════════════════════════════════════════════


def delete_embeddings_by_path(relative_path: str) -> int:
    """Delete all embeddings for a given relative_path via direct SQL.

    Returns the number of rows deleted.
    """
    try:
        conn = psycopg2.connect(_VECTOR_DSN)
        cur = conn.cursor()
        cur.execute(
            """
            DELETE FROM embeddings
            WHERE vector_store_id = %s
              AND metadata->>'relative_path' = %s
            """,
            (VECTOR_STORE_ID, relative_path),
        )
        deleted = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return deleted
    except Exception as exc:
        log(f"  ⚠️  Direct SQL delete failed for '{relative_path}': {exc}")
        return 0


def update_embeddings_hash(
    relative_path: str, content_hash: str
) -> int:
    """Update content_hash metadata for all chunks of a file without
    re-embedding.  Used after init-vector-store to add hashes to existing
    embeddings.

    Returns the number of rows updated.
    """
    try:
        conn = psycopg2.connect(_VECTOR_DSN)
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE embeddings
            SET metadata = metadata || %s::jsonb
            WHERE vector_store_id = %s
              AND metadata->>'relative_path' = %s
            """,
            (
                json.dumps({"content_hash": content_hash}),
                VECTOR_STORE_ID,
                relative_path,
            ),
        )
        updated = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        return updated
    except Exception as exc:
        log(
            f"  ⚠️  Hash update failed for"
            f" '{relative_path}': {exc}"
        )
        return 0


def fetch_stored_paths() -> dict[str, str | None]:
    """Return a mapping of relative_path → content_hash for all embeddings
    in the vector store, with ``None`` for paths that have no hash yet
    (legacy embeddings from init-vector-store which predate hash tracking).
    """
    try:
        conn = psycopg2.connect(_VECTOR_DSN)
        cur = conn.cursor()
        cur.execute(
            """
            SELECT DISTINCT
                metadata->>'relative_path' AS path,
                metadata->>'content_hash' AS hash
            FROM embeddings
            WHERE vector_store_id = %s
              AND metadata->>'relative_path' IS NOT NULL
            ORDER BY path
            """,
            (VECTOR_STORE_ID,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result: dict[str, str | None] = {}
        for path, h in rows:
            if path:
                # h may be None for legacy embeddings (init-vector-store)
                result[path] = h if h else None
        return result
    except Exception as exc:
        log(f"  ⚠️  Could not fetch stored paths: {exc}")
        return {}


# ═══════════════════════════════════════════════════════════════════════════════
# File ingestion
# ═══════════════════════════════════════════════════════════════════════════════


def ingest_file(file_path: Path, docs_dir: Path) -> tuple[int, int]:
    """Ingest a single file into the vector store.

    Returns (chunks_stored, chunks_failed).
    """
    rel_path = str(file_path.relative_to(docs_dir))
    log(f"  📄 {rel_path}")

    # -- Read file content ------------------------------------------------
    try:
        text = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            text = file_path.read_text(encoding="latin-1")
        except Exception as exc:
            log(f"    ⚠️  SKIP: Could not read file: {exc}")
            return (0, 1)

    if not text.strip():
        log("    ⚠️  SKIP: Empty file")
        return (0, 0)

    # -- Compute content hash ---------------------------------------------
    content_hash = compute_file_hash(file_path)

    chunks = chunk_text(text, CHUNK_SIZE, OVERLAP)
    log(f"    Chunks: {len(chunks)}")

    stored = 0
    failed = 0

    for i, chunk in enumerate(chunks):
        try:
            pieces = generate_embedding_auto_split(chunk)
            for j, (piece_text, embedding) in enumerate(pieces):
                embed_id = store_embedding(
                    piece_text,
                    embedding,
                    metadata={
                        "filename": file_path.name,
                        "relative_path": rel_path,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "source": "consume-docs",
                        "content_hash": content_hash,
                    },
                )
                stored += 1
                suffix = f" (split {j + 1}/{len(pieces)})" if len(pieces) > 1 else ""
                log(f"      ✅ Chunk {i + 1}/{len(chunks)}{suffix} → {embed_id}")
        except Exception as exc:
            failed += 1
            log(f"      ❌ FAIL Chunk {i + 1}/{len(chunks)}: {exc}")

    return (stored, failed)


# ═══════════════════════════════════════════════════════════════════════════════
# Initial sync — run once on startup
# ═══════════════════════════════════════════════════════════════════════════════


def initial_sync() -> None:
    """Synchronize the vector store with the current state of consume-docs.

    - Files with matching content_hash → skip.
    - Files with no hash (legacy from init-vector-store) → update metadata
      with hash only (no re-ingestion).
    - Files with mismatched hash → delete old embeddings, re-ingest.
    - Files on disk not in store → ingest.
    - Embeddings for files no longer on disk → delete.
    """
    docs_path = Path(DOCS_DIR)
    if not docs_path.is_dir():
        log(f"No docs directory at {DOCS_DIR} — skipping initial sync")
        return

    log("=== Initial sync: comparing disk state vs vector store ===\n")

    # -- Collect files currently on disk -----------------------------------
    disk_files: dict[str, Path] = {}
    for root, dirs, files in os.walk(docs_path):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for fname in files:
            if fname.startswith("."):
                continue
            if not fname.endswith(SUPPORTED_EXTENSIONS):
                continue
            full_path = Path(root) / fname
            rel = str(full_path.relative_to(docs_path))
            disk_files[rel] = full_path

    # -- Load stored paths from vector store --------------------------------
    stored_paths = fetch_stored_paths()
    stored_set = set(stored_paths.keys())
    disk_set = set(disk_files.keys())

    new_files = disk_set - stored_set
    legacy_files: set[str] = set()      # in store but no hash
    unchanged_files: set[str] = set()   # hash matches
    changed_files: set[str] = set()     # hash differs

    for path in disk_set & stored_set:
        current_hash = compute_file_hash(disk_files[path])
        stored_hash = stored_paths[path]
        if stored_hash is None:
            # Legacy embedding from init-vector-store (no hash) — just
            # add the hash, don't re-embed identical content.
            legacy_files.add(path)
        elif current_hash == stored_hash:
            unchanged_files.add(path)
        else:
            changed_files.add(path)

    # Files in store but not on disk → orphaned
    orphaned_files = stored_set - disk_set

    log(
        f"  Summary: {len(disk_files)} on disk,"
        f" {len(stored_paths)} in store"
    )
    log(
        f"    Unchanged: {len(unchanged_files)},"
        f" Changed: {len(changed_files)},"
        f" New: {len(new_files)},"
        f" Legacy: {len(legacy_files)},"
        f" Orphaned: {len(orphaned_files)}\n"
    )

    # -- Delete orphaned embeddings -----------------------------------------
    for path in sorted(orphaned_files):
        log(f"  🗑️  Deleting orphaned: {path}")
        deleted = delete_embeddings_by_path(path)
        log(f"      Deleted {deleted} embedding(s)")

    # -- Handle changed files: delete old, re-ingest ------------------------
    for path in sorted(changed_files):
        log(f"  🔄  Changed: {path}")
        delete_embeddings_by_path(path)
        ingest_file(disk_files[path], docs_path)

    # -- Handle new files ---------------------------------------------------
    for path in sorted(new_files):
        log(f"  ✨ New: {path}")
        ingest_file(disk_files[path], docs_path)

    # -- Handle legacy files: add hash to metadata without re-embedding -----
    for path in sorted(legacy_files):
        h = compute_file_hash(disk_files[path])
        updated = update_embeddings_hash(path, h)
        log(f"  🔖 Added hash to legacy embeddings for: {path} ({updated} chunks)")

    total_stored_new = len(changed_files) + len(new_files)
    log(
        f"\n=== Initial sync complete:"
        f" {total_stored_new} file(s) ingested,"
        f" {len(orphaned_files)} orphan(s) deleted,"
        f" {len(legacy_files)} legacy tagged,"
        f" {len(unchanged_files)} unchanged ===\n"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Filesystem event handler (watchdog)
# ═══════════════════════════════════════════════════════════════════════════════


class DocsEventHandler(FileSystemEventHandler):
    """Handles create / modify / delete events on consume-docs.

    Uses a debounce timer to avoid processing a file while it is still
    being written (e.g., `git pull` or editor save with multiple events).
    """

    def __init__(self, docs_path: Path) -> None:
        super().__init__()
        self._docs_path = docs_path
        self._pending: dict[str, float] = {}  # rel_path → event_time

    def _should_ignore(self, path: str) -> bool:
        """Filter temporary/editor files and unsupported extensions."""
        basename = Path(path).name
        if basename.startswith("."):
            return True
        if basename.endswith("~"):
            return True
        if not path.endswith(SUPPORTED_EXTENSIONS):
            return True
        return False

    def _schedule(self, rel_path: str) -> None:
        """Record the event time; the debounce loop will pick it up."""
        self._pending[rel_path] = time.monotonic()

    def _consume_pending(self) -> None:
        """Process any file whose last event was >= DEBOUNCE_SECONDS ago."""
        now = time.monotonic()
        ready = [
            path
            for path, tstamp in self._pending.items()
            if now - tstamp >= DEBOUNCE_SECONDS
        ]
        for rel_path in sorted(ready):
            del self._pending[rel_path]
            self._process(rel_path)

    def _process(self, rel_path: str) -> None:
        """Handle a stabilized file: check if it still exists, then ingest."""
        full_path = self._docs_path / rel_path

        if not full_path.is_file():
            # File was deleted during debounce
            log(f"  🗑️  Deleted (debounced): {rel_path}")
            delete_embeddings_by_path(rel_path)
            return

        # Compare with stored hash
        stored_paths = fetch_stored_paths()
        new_hash = compute_file_hash(full_path)

        if rel_path in stored_paths and stored_paths[rel_path] == new_hash:
            log(f"  ⏭️  Unchanged (debounce noise): {rel_path}")
            return

        # Delete old embeddings if any, then ingest
        if rel_path in stored_paths:
            log(f"  🔄  Modified: {rel_path}")
        else:
            log(f"  ✨ Created: {rel_path}")

        delete_embeddings_by_path(rel_path)
        stored, failed = ingest_file(full_path, self._docs_path)
        log(
            f"     → {stored} chunks stored, {failed} failures"
            f" for {rel_path}"
        )

    # -- watchdog event callbacks ------------------------------------------

    def on_created(self, event: Any) -> None:
        if event.is_directory:
            return
        rel_path = str(
            Path(event.src_path).relative_to(self._docs_path)
        )
        if self._should_ignore(rel_path):
            return
        log(f"  [watchdog] created: {rel_path}")
        self._schedule(rel_path)

    def on_modified(self, event: Any) -> None:
        if event.is_directory:
            return
        rel_path = str(
            Path(event.src_path).relative_to(self._docs_path)
        )
        if self._should_ignore(rel_path):
            return
        # Only log once per file per batch (avoid spam from multi-write)
        if rel_path not in self._pending:
            log(f"  [watchdog] modified: {rel_path}")
        self._schedule(rel_path)

    def on_deleted(self, event: Any) -> None:
        if event.is_directory:
            return
        rel_path = str(
            Path(event.src_path).relative_to(self._docs_path)
        )
        if self._should_ignore(rel_path):
            return
        log(f"  [watchdog] deleted: {rel_path}")
        # Delete immediately (no debounce needed for deletes)
        delete_embeddings_by_path(rel_path)

    def on_moved(self, event: Any) -> None:
        if event.is_directory:
            return
        src_rel = str(
            Path(event.src_path).relative_to(self._docs_path)
        )
        dest_rel = str(
            Path(event.dest_path).relative_to(self._docs_path)
        )
        if self._should_ignore(src_rel) and self._should_ignore(dest_rel):
            return
        log(f"  [watchdog] moved: {src_rel} → {dest_rel}")
        delete_embeddings_by_path(src_rel)
        self._schedule(dest_rel)


# ═══════════════════════════════════════════════════════════════════════════════
# Main — health-wait → initial sync → watch loop
# ═══════════════════════════════════════════════════════════════════════════════


def main() -> None:
    log("=== MesseBuddy File Watcher ===")
    log(f"  Docs dir:       {DOCS_DIR}")
    log(f"  Vector store:   {VECTOR_STORE_ID}")
    log(f"  Extensions:     {SUPPORTED_EXTENSIONS}")
    log(f"  Chunk size:     {CHUNK_SIZE}")
    log(f"  Overlap:        {OVERLAP}")
    log(f"  Debounce:       {DEBOUNCE_SECONDS}s\n")

    # -- Wait for infrastructure --------------------------------------------
    wait_for_postgres()
    wait_for_http("pgvector connector", f"{_PGVECTOR_URL}/health")
    wait_for_http(
        "LiteLLM proxy", f"{_LITELLM_URL}/health/readiness"
    )

    # -- Bootstrap (idempotent) ----------------------------------------------
    bootstrap()

    # -- Initial sync -------------------------------------------------------
    initial_sync()

    # -- Filesystem watch ---------------------------------------------------
    docs_path = Path(DOCS_DIR)
    if not docs_path.is_dir():
        log("No docs directory — exiting (nothing to watch)")
        return

    event_handler = DocsEventHandler(docs_path)
    observer = Observer()
    observer.schedule(event_handler, str(docs_path), recursive=True)
    observer.start()
    log(f"👁️  Watching {docs_path} for changes...\n")

    try:
        while True:
            time.sleep(1)
            # Process any debounced files
            event_handler._consume_pending()
    except KeyboardInterrupt:
        log("\nShutting down watcher...")
    finally:
        observer.stop()
        observer.join()
        log("Watcher stopped.")


if __name__ == "__main__":
    main()
