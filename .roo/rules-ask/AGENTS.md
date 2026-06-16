# Ask Mode Rules (Non-Obvious Only)

- **[`SPECS.md`](SPECS.md) is the single authoritative reference** for this project. It defines all terminology, data models, component trees, algorithms, constraints (C-01 through C-17), and open decisions (OD-01 through OD-12). Always consult it before answering architectural questions.
- **[`plans/prototype-impl-strategy.md`](plans/prototype-impl-strategy.md) contains the implementation roadmap** and phased approach documentation.
- **`src/lib/` is empty** - there are no shared library utilities beyond what's in `src/utils/` and `src/use-cases/`.
- **`consume-docs/`** feeds the RAG ingestion pipeline. Documents placed there are chunked, embedded, and stored in pgvector at `docker compose` startup (or via `docker compose run --rm ingest`).
- **No auth collections** are used in PocketBase (C-03). All identity is client-side UID-based. The `role` field in `LocalIdentity` is client-stored and not server-validated.
- **`deno fmt` excludes** `src/testdata/`, `src/generated/**/*.ts`, and `src/**/*.css` ([`deno.json`](deno.json:17)).
- **`useChatStream` is a Phase 1 stub** ([`useChatStream.ts`](src/hooks/useChatStream.ts:20)) - returns empty state with a no-op `send()`. Real AI streaming will be wired in Phase 6.
