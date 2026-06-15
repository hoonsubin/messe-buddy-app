#!/usr/bin/env python3
"""
Enable the pgvector extension on the target database before Prisma runs.

The pgvector/pgvector:pg16 image ships the extension but it must be
activated per-database.  Without this step, prisma db push fails with
"type vector does not exist" when creating the embedding column.
"""

import os
import sys
import time

import psycopg2

MAX_RETRIES = 10
RETRY_INTERVAL = 3


def main() -> None:
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        print("[enable_vector_ext] FATAL: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            conn = psycopg2.connect(dsn)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cur.close()
            conn.close()
            print("[enable_vector_ext] pgvector extension enabled")
            return
        except psycopg2.OperationalError as exc:
            last_error = exc
            print(
                f"[enable_vector_ext] attempt {attempt}/{MAX_RETRIES}: "
                f"{exc}"
            )
            time.sleep(RETRY_INTERVAL)
        except Exception as exc:
            print(f"[enable_vector_ext] FATAL: {exc}", file=sys.stderr)
            sys.exit(1)

    print(
        f"[enable_vector_ext] FATAL: database not reachable after "
        f"{MAX_RETRIES} attempts: {last_error}",
        file=sys.stderr,
    )
    sys.exit(1)


if __name__ == "__main__":
    main()