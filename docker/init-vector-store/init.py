#!/usr/bin/env python3
"""
MesseBuddy - Vector Store Initializer (Orchestration Layer)

Orchestrates a 7-step pipeline that bootstraps the pgvector vector store
and registers it in LiteLLM metadata.  Every step emits [OK] or [FAIL] —
no silent failures.  Exits non-zero if a required step fails.

Responsibilities of this file:
  - Read and validate configuration from environment variables.
  - Wait for dependent services to become healthy.
  - Log every step with timestamps and status indicators.
  - Call pure functional helpers from ``helpers.py``.
  - Own the deployment life-cycle: what order to run, what to retry,
    what constitutes a hard failure vs. a warning.

All pure data-manipulation logic lives in ``helpers.py``.
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

import helpers

# ═══════════════════════════════════════════════════════════════════════════
# Configuration — read once from the environment, validated at module load.
# All values are frozen so the rest of the file reads stale-free constants.
# ═══════════════════════════════════════════════════════════════════════════

# -- PostgreSQL DSN components --
POSTGRES_USER = os.getenv("POSTGRES_USER", "litellm")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "changeme")

POSTGRES_VECTOR_DB = os.getenv("POSTGRES_VECTOR_DB", "litellm_vector")
POSTGRES_VECTOR_HOST = os.getenv("POSTGRES_VECTOR_HOST", "vector-db")
POSTGRES_VECTOR_PORT = os.getenv("POSTGRES_VECTOR_PORT", "5432")

LITELLM_DB_DB = os.getenv("POSTGRES_DB", "litellm")
LITELLM_DB_HOST = os.getenv("LITELLM_DB_HOST", "litellm-db")
LITELLM_DB_PORT = os.getenv("LITELLM_DB_PORT", "5432")

# -- Service URLs --
PGVECTOR_HOST = os.getenv("PGVECTOR_HOST", "litellm-pgvector")
PGVECTOR_PORT = os.getenv("PGVECTOR_PORT", "8001")

LITELLM_HOST = os.getenv("LITELLM_HOST", "litellm")
LITELLM_PORT = os.getenv("LITELLM_PORT", "4000")

# -- Secrets --
LITELLM_MASTER_KEY = os.getenv(
    "LITELLM_MASTER_KEY", "sk-dev-change-in-production"
)

# -- Vector store identity --
VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "messe-buddy-kb")
VECTOR_STORE_NAME = os.getenv(
    "VECTOR_STORE_NAME", "messe-buddy-knowledge-base"
)

# -- Timing --
WAIT_TIMEOUT = int(os.getenv("WAIT_TIMEOUT", "120"))
WAIT_INTERVAL = int(os.getenv("WAIT_INTERVAL", "3"))

# -- Document ingestion --
DOCS_DIR = os.getenv("DOCS_DIR", "/consume-docs")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "2000"))
OVERLAP = int(os.getenv("OVERLAP", "200"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text-v2-moe")
SUPPORTED_EXTENSIONS = os.getenv(
    "SUPPORTED_EXTENSIONS",
    ".txt,.md,.csv,.html,.json,.xml,.yaml,.yml",
).split(",")

# -- Virtual key --
RUNTIME_DIR = os.getenv("RUNTIME_DIR", "/runtime")
VIRTUAL_KEY_ALIAS = os.getenv("VIRTUAL_KEY_ALIAS", "messebuddy-pwa")
VIRTUAL_KEY_MODELS = [
    m.strip()
    for m in os.getenv("VIRTUAL_KEY_MODELS", "policy-assistant").split(",")
    if m.strip()
]
VIRTUAL_KEY_BUDGET = float(os.getenv("VIRTUAL_KEY_BUDGET", "5"))

# -- Derived values (computed once) --
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

# ═══════════════════════════════════════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════════════════════════════════════


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


# ═══════════════════════════════════════════════════════════════════════════
# Health-wait utilities
# ═══════════════════════════════════════════════════════════════════════════


def wait_for_postgres() -> None:
    """Poll vector-db until it accepts connections (psycopg2)."""
    log(
        f"Step 0: Waiting for PostgreSQL"
        f" ({POSTGRES_VECTOR_HOST}:{POSTGRES_VECTOR_PORT})..."
    )
    elapsed = 0
    while elapsed < WAIT_TIMEOUT:
        try:
            conn = psycopg2.connect(_VECTOR_DSN)
            conn.close()
            ok(f"PostgreSQL is ready ({elapsed}s)")
            return
        except psycopg2.OperationalError:
            time.sleep(WAIT_INTERVAL)
            elapsed += WAIT_INTERVAL
    fail(f"PostgreSQL not ready after {WAIT_TIMEOUT}s")


def wait_for_http(
    label: str,
    url: str,
    *,
    api_key: str | None = None,
    expect_json_status: str | None = None,
) -> None:
    """Poll an HTTP health endpoint with permissive/JSON-status modes."""
    log(f"Waiting for {label} ({url})...")
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    elapsed = 0
    last_error = ""
    while elapsed < WAIT_TIMEOUT:
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
        time.sleep(WAIT_INTERVAL)
        elapsed += WAIT_INTERVAL
    extra = f" (last: {last_error})" if last_error else ""
    fail(f"{label} not healthy after {WAIT_TIMEOUT}s{extra}")


# ═══════════════════════════════════════════════════════════════════════════
# Orchestrated steps — each calls into helpers.py and logs the outcome
# ═══════════════════════════════════════════════════════════════════════════


def step_insert_vector_store() -> None:
    """Insert the vector store row into pgvector (step 3)."""
    log(
        f"Step 3: Creating vector store '{VECTOR_STORE_ID}'"
        f" in pgvector tables..."
    )
    try:
        row_id = helpers.insert_vector_store_row(
            vector_dsn=_VECTOR_DSN,
            vector_store_id=VECTOR_STORE_ID,
            vector_store_name=VECTOR_STORE_NAME,
        )
        if row_id:
            ok(f"Inserted vector store row - id={row_id}")
        else:
            warn(
                f"Row already exists for"
                f" vector_store_id='{VECTOR_STORE_ID}'"
                " (idempotent, no action taken)"
            )
    except RuntimeError as exc:
        fail(str(exc))


def step_verify_pgvector_store() -> None:
    """Verify the pgvector connector lists our store (step 4)."""
    log("Step 4: Verifying pgvector connector lists the store...")
    found = helpers.verify_pgvector_store(
        pgvector_url=_PGVECTOR_URL,
        api_key=LITELLM_MASTER_KEY,
        vector_store_id=VECTOR_STORE_ID,
    )
    if found:
        ok(f"Pgvector connector lists vector store '{VECTOR_STORE_ID}'")
    else:
        warn(
            f"Pgvector connector does not list store"
            f" '{VECTOR_STORE_ID}' — store may still work at runtime"
        )


def step_seed_master_key() -> None:
    """Seed the master key in LiteLLM DB (step 2a)."""
    log("Step 2a: Seeding master key in LiteLLM database...")
    try:
        inserted = helpers.seed_master_key(
            litellm_dsn=_LITELLM_DSN,
            master_key=LITELLM_MASTER_KEY,
            wait_timeout=WAIT_TIMEOUT,
            wait_interval=WAIT_INTERVAL,
        )
        if inserted:
            ok("Master key seeded")
        else:
            ok("Master key already exists (idempotent, no action)")
    except RuntimeError as exc:
        fail(str(exc))


def step_register_credential() -> None:
    """Register pgvector credentials in LiteLLM (step 5)."""
    log("Step 5: Registering pgvector credentials in LiteLLM...")
    status = helpers.register_credential_in_litellm(
        litellm_url=_LITELLM_URL,
        pgvector_url=_PGVECTOR_URL,
        master_key=LITELLM_MASTER_KEY,
        vector_store_name=VECTOR_STORE_NAME,
        vector_store_id=VECTOR_STORE_ID,
        litellm_dsn=_LITELLM_DSN,
    )
    _report_registration_status("Step 5", status)


def step_register_managed_vector_store() -> None:
    """Register managed vector store in LiteLLM proxy (step 5b)."""
    log("Step 5b: Registering managed vector store in LiteLLM proxy...")
    status = helpers.register_managed_vector_store(
        litellm_url=_LITELLM_URL,
        pgvector_url=_PGVECTOR_URL,
        master_key=LITELLM_MASTER_KEY,
        vector_store_name=VECTOR_STORE_NAME,
        vector_store_id=VECTOR_STORE_ID,
        litellm_dsn=_LITELLM_DSN,
    )
    _report_registration_status("Step 5b", status)


def _report_registration_status(step_label: str, status: str) -> None:
    """Translate a registration status string into log output."""
    if status == "api":
        ok(f"{step_label}: Registered via LiteLLM API")
    elif status == "api-idempotent":
        ok(f"{step_label}: Already registered (idempotent)")
    elif status == "db-fallback":
        ok(f"{step_label}: Inserted via DB fallback")
    elif status == "db-idempotent":
        ok(f"{step_label}: Row already exists in DB (idempotent)")
    else:  # "unregistered"
        warn(
            f"{step_label}: DB fallback also failed."
            " RAG will NOT be active for the policy-assistant model."
            " Create the vector store manually in the Admin UI at"
            " Experimental > Vector Stores."
        )


def step_ingest_documents() -> None:
    """Ingest documents from /consume-docs (step 6)."""
    if not Path(DOCS_DIR).is_dir():
        log(
            "Step 6: No /consume-docs directory — skipping ingestion"
            f" (looked at {DOCS_DIR})"
        )
        return

    log("Step 6: Ingesting documents from /consume-docs...")
    total_chunks, total_failures = helpers.ingest_documents(
        docs_dir=DOCS_DIR,
        pgvector_url=_PGVECTOR_URL,
        litellm_url=_LITELLM_URL,
        api_key=LITELLM_MASTER_KEY,
        vector_store_id=VECTOR_STORE_ID,
        embedding_model=EMBEDDING_MODEL,
        supported_extensions=SUPPORTED_EXTENSIONS,
        chunk_size=CHUNK_SIZE,
        overlap=OVERLAP,
    )
    if total_failures > 0:
        fail(
            f"Document ingestion had {total_failures} failure(s)"
            f" — check logs above"
        )
    elif total_chunks > 0:
        ok(f"Documents ingested — {total_chunks} chunk(s) stored")
    # else: no files found — ingest_documents already printed a message


def step_generate_virtual_key() -> None:
    """Mint the front-end virtual key and persist to /runtime (step 7)."""
    log("Step 7: Provisioning front-end virtual key...")
    key_file = Path(RUNTIME_DIR) / "virtual_key"

    # Reuse an existing, still-valid key.
    if key_file.is_file():
        existing = key_file.read_text().strip()
        if existing:
            try:
                resp = requests.get(
                    f"{_LITELLM_URL}/key/info",
                    headers={
                        "Authorization": f"Bearer {LITELLM_MASTER_KEY}"
                    },
                    params={"key": existing},
                    timeout=10,
                )
                if resp.status_code == 200:
                    ok("Reusing existing virtual key (idempotent)")
                    return
            except requests.RequestException:
                pass
            warn("Existing virtual key invalid — minting a replacement")

    try:
        key = helpers.generate_virtual_key(
            litellm_url=_LITELLM_URL,
            master_key=LITELLM_MASTER_KEY,
            key_alias=VIRTUAL_KEY_ALIAS,
            models=VIRTUAL_KEY_MODELS,
            max_budget=VIRTUAL_KEY_BUDGET,
        )
        Path(RUNTIME_DIR).mkdir(parents=True, exist_ok=True)
        key_file.write_text(key)
        ok(
            f"Virtual key provisioned → {key_file}"
            f" (alias={VIRTUAL_KEY_ALIAS},"
            f" models={VIRTUAL_KEY_MODELS},"
            f" budget={VIRTUAL_KEY_BUDGET})"
        )
    except RuntimeError as exc:
        fail(str(exc))
    except requests.RequestException as exc:
        fail(f"Could not generate virtual key: {exc}")


# ═══════════════════════════════════════════════════════════════════════════
# Main — the deployment life-cycle itself
# ═══════════════════════════════════════════════════════════════════════════


def main() -> None:
    log("=== MesseBuddy Vector Store Initializer ===")

    # -- Phase A: Wait for infrastructure to be ready ------------------------
    wait_for_postgres()
    wait_for_http("pgvector connector", f"{_PGVECTOR_URL}/health")
    wait_for_http(
        "LiteLLM proxy",
        f"{_LITELLM_URL}/health/readiness",
        api_key=LITELLM_MASTER_KEY,
        expect_json_status="healthy",
    )

    # -- Phase B: Seed authentication so subsequent API calls work -----------
    step_seed_master_key()

    # -- Phase C: Create the vector store in the authoritative source --------
    step_insert_vector_store()

    # -- Phase D: Verify + register the store in LiteLLM's metadata ----------
    step_verify_pgvector_store()
    step_register_credential()
    step_register_managed_vector_store()

    # -- Phase E: Ingest documents (idempotent — appends on re-runs) ---------
    step_ingest_documents()

    # -- Phase F: Provision the PWA virtual key for nginx --------------------
    step_generate_virtual_key()

    # -- Done -----------------------------------------------------------------
    log("=" * 60)
    log("Vector store initialization complete")
    log(f"  Store ID:   {VECTOR_STORE_ID}")
    log(f"  Store Name: {VECTOR_STORE_NAME}")
    log(f"  Pgvector:   {_PGVECTOR_URL}")
    log(f"  LiteLLM UI: {_LITELLM_URL}/ui")
    log("")
    log("=" * 60)


if __name__ == "__main__":
    main()
