#!/usr/bin/env python3
"""
MesseBuddy - File Watcher

Watches ``consume-docs`` for file create / modify / delete events and
updates pgvector embeddings incrementally.

Design:
  - One-shot initial sync on startup: compares disk state against the vector
    store, re-ingests changed files, removes orphaned embeddings.
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

On first run after init-vector-store (which does *not* store content_hash),
unchanged files get their metadata updated with the hash without re-ingestion.
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

PGVECTOR_HOST = os.getenv("PGVECTOR_HOST", "litellm-pgvector")
PGVECTOR_PORT = os.getenv("PGVECTOR_PORT", "8001")

LITELLM_HOST = os.getenv("LITELLM_HOST", "litellm")
LITELLM_PORT = os.getenv("LITELLM_PORT", "4000")

LITELLM_MASTER_KEY = os.getenv(
    "LITELLM_MASTER_KEY", "sk-dev-change-in-production"
)

VECTOR_STORE_ID = os.getenv("VECTOR_STORE_ID", "messe-buddy-kb")
DOCS_DIR = os.getenv("DOCS_DIR", "/consume-docs")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "2000"))
OVERLAP = int(os.getenv("OVERLAP", "200"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text-v2-moe")

SUPPORTED_EXTENSIONS = tuple(
    os.getenv(
        "SUPPORTED_EXTENSIONS",
        ".txt,.md,.csv,.html,.json,.xml,.yaml,.yml",
    ).split(",")
)

WAIT_TIMEOUT = int(os.getenv("WAIT_TIMEOUT", "120"))
WAIT_INTERVAL = int(os.getenv("WAIT_INTERVAL", "3"))
DEBOUNCE_SECONDS = float(os.getenv("DEBOUNCE_SECONDS", "2.0"))

# Derived — computed once at module load
_VECTOR_DSN = (
    f"dbname={POSTGRES_VECTOR_DB} user={POSTGRES_USER}"
    f" password={POSTGRES_PASSWORD}"
    f" host={POSTGRES_VECTOR_HOST} port={POSTGRES_VECTOR_PORT}"
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


def generate_embedding(text: str, max_retries: int = 3) -> list[float]:
    """Generate an embedding vector via LiteLLM proxy with exponential backoff."""
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            resp = requests.post(
                f"{_LITELLM_URL}/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
                    "Content-Type": "application/json",
                },
                json={"model": EMBEDDING_MODEL, "input": [text]},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
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
            embedding = generate_embedding(chunk)
            embed_id = store_embedding(
                chunk,
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
            log(f"      ✅ Chunk {i + 1}/{len(chunks)} → {embed_id}")
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
