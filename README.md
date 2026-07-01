# MesseBuddy

> Gamified corporate onboarding — an interactive map, missions, and XP progression for new employees.

MesseBuddy is a **mobile-first Progressive Web App** that turns the onboarding journey into an interactive adventure. New employees explore office spaces (Milestones) with activities (Missions), earn XP, and get real-world help from mentors — all without any native app installation.

[Features](#features) • [Quick Start](#quick-start) • [Configuration](#configuration) • [Model Providers](#model-providers) • [Documentation](#documentation)

---

## Features

- **Interactive Milestone Map** — Navigate office spaces on a visual map with percentage-based node positioning
- **Mission-driven progression** — Complete text, link, and form missions with configurable validation methods (Game Maker approval, self-approval, or QR scanning)
- **XP & Progress tracking** — Earn XP by completing missions; see milestone-level and session-level progress
- **AI Chatbot with RAG** — Ask questions about onboarding context via an integrated chat panel backed by retrieval-augmented generation (pgvector + LiteLLM)
- **Buddy System** — Assign company mentors visible in the player cockpit
- **Pre-boarding Checklist** — Configure preparatory steps that players complete before the session begins
- **Recovery Keys** — 8-character alphanumeric token for identity restoration when localStorage is cleared

---

## Tech Stack

| Layer | Technology | Docs |
|-------|-----------|------|
| Frontend | [React 19](https://react.dev) + TypeScript (strict) + [Vite 8](https://vite.dev) | — |
| Runtime | [Deno 2.8+](https://deno.com) (replaces Node/npm entirely) | [Docs](https://docs.deno.com/) |
| Backend | [PocketBase](https://pocketbase.io) (Go, REST + SSE + SQLite) | [API Docs](https://pocketbase.io/docs/) |
| AI Gateway | [LiteLLM Proxy](https://litellm.ai) (OpenAI-compatible `/chat/completions`) | [Proxy Docs](https://docs.litellm.ai/docs/proxy/configs) |
| Vector DB | [PostgreSQL](https://www.postgresql.org) + [pgvector](https://github.com/pgvector/pgvector) | [pgvector](https://github.com/pgvector/pgvector) |

> [!NOTE]
> Deno replaces npm/yarn entirely. All dependencies are declared in [`deno.json`](deno.json).

---

## Quick Start

### Local development (frontend only)

```sh
deno install          # Pre-fetch npm dependencies
deno task dev         # Vite dev server with HMR → http://localhost:5173
```

The app runs with the mock adapter — no backend required. Set `VITE_USE_MOCK_PB=true` to develop with simulated data.

### Full-stack with Docker

```sh
cp .env.example .env  # Fill in LLM_SERVER_API_KEY and LITELLM_MASTER_KEY
docker compose up --build
```

| Service | URL |
|---------|-----|
| PWA (app) | `http://localhost` |
| PocketBase admin | `http://localhost:8090/_/` |
| LiteLLM proxy | `http://localhost:4000` |
| LiteLLM pgvector API | `http://localhost:8001` |

---

## Configuration

### Environment Variables

Copy [`.env.example`](.env.example) to `.env`. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `LLM_SERVER_API_KEY` | Yes | API key for the upstream inference provider (OpenAI, Anthropic, etc.) |
| `LITELLM_MASTER_KEY` | Yes | Proxy management + pgvector connector auth |
| `VITE_USE_MOCK_PB` | No | `"false"` in production — real PocketBase adapter |
| `EMBEDDING_MODEL` | No | RAG embedding model (default: `gemini-embedding-2`) |
| `RERANK_ENABLED` | No | `"false"` → plain vector-similarity order |

> [!TIP]
> `VITE_*` variables are **build-time** — frozen into the JS bundle. Override via Docker build args for non-localhost deployments. The LiteLLM virtual key is minted at container runtime by `file-watcher`, so it never appears in `.env`.

### RAG Knowledge Base

Documents in [`consume-docs/`](consume-docs/) are chunked, embedded, and stored in pgvector. The `file-watcher` service watches that directory continuously — just add, edit, or remove a file and changes are picked up automatically.

---

## Model Providers

Model configuration lives in [`docker/litellm.yaml`](docker/litellm.yaml). Edit the YAML to swap providers — no code change required. See [LiteLLM Proxy config docs](https://docs.litellm.ai/docs/proxy/configs) for all options.

### Chat Model

#### Self-hosted OpenAI-compatible (default)

The default routes through an OpenAI-compatible endpoint. LiteLLM's `openai/` prefix means "use the OpenAI API protocol" — it does **not** mean the real OpenAI API. Any endpoint implementing `/v1/chat/completions` works (vLLM, llama.cpp, Ollama, etc.). See [LiteLLM OpenAI-compatible docs](https://docs.litellm.ai/docs/providers/openai_compatible).

```yaml
  - model_name: policy-assistant
    litellm_params:
      model: openai/<model-name>
      api_base: https://your-host/v1
      api_key: os.environ/LLM_SERVER_API_KEY
      vector_store_ids: ["messe-buddy-kb"]
```

#### OpenAI

To use the real [OpenAI API](https://platform.openai.com/docs/api-reference/chat):

```yaml
  - model_name: policy-assistant
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY
      vector_store_ids: ["messe-buddy-kb"]
```

> See [LiteLLM OpenAI docs](https://docs.litellm.ai/docs/providers/openai).

#### Anthropic

Requires `ANTHROPIC_API_KEY`. See [LiteLLM Anthropic docs](https://docs.litellm.ai/docs/providers/anthropic) and the [Anthropic API docs](https://docs.anthropic.com/en/docs/build-with-claude/overview).

```yaml
  - model_name: policy-assistant
    litellm_params:
      model: anthropic/claude-sonnet-4-5-20250929
      api_key: os.environ/ANTHROPIC_API_KEY
      vector_store_ids: ["messe-buddy-kb"]
```

#### Azure OpenAI

See [LiteLLM Azure docs](https://docs.litellm.ai/docs/providers/azure).

```yaml
  - model_name: policy-assistant
    litellm_params:
      model: azure/gpt-4o-mini
      api_base: os.environ/AZURE_API_BASE
      api_key: os.environ/AZURE_API_KEY
      vector_store_ids: ["messe-buddy-kb"]
```

### Embedding Model

The default embedding model is [Gemini Embedding 2](https://cloud.google.com/gemini/docs/embeddings) — a multimodal model producing 3072-dim vectors by default (MRL-supported). Set `EMBEDDING_MODEL` in `.env` to change it.

To use OpenAI embeddings instead:

```yaml
  - model_name: text-embedding-3-small
    litellm_params:
      model: openai/text-embedding-3-small
      api_key: os.environ/OPENAI_API_KEY
    model_info:
      mode: embedding
```

### Reranker Model

The default reranker is [BGE Reranker v2 M3](https://huggingface.co/BAAI/bge-reranker-v2-m3) (BAAI, 0.6B params, multilingual, Apache 2.0). It uses the `hosted_vllm/` LiteLLM provider which exposes the `/rerank` endpoint (the standard `openai/` provider does **not** support rerank). Set `RERANK_MODEL` in `.env` to change it.

To use HuggingFace-hosted reranking instead:

```yaml
  - model_name: bge-reranker-base
    litellm_params:
      model: huggingface/BAAI/bge-reranker-base
      api_key: os.environ/HF_TOKEN
    model_info:
      mode: rerank
```

> Set `RERANK_ENABLED=false` to skip reranking and use plain vector-similarity order.

---

## Documentation

| Resource | Description |
|----------|-------------|
| [`SPECS.md`](SPECS.md) | Authoritative project specification — data model, constraints, use cases |
| [`AGENTS.md`](AGENTS.md) | Agent-focused guide — commands, code style, architecture details |
| [`docs/pb-schema.md`](docs/pb-schema.md) | PocketBase schema reference — all 9 collections |
| [`design/design-tokens.md`](design/design-tokens.md) | Design tokens — colors, typography, spacing |
| [`docker/litellm.yaml`](docker/litellm.yaml) | LiteLLM proxy configuration — models, providers, RAG settings |
