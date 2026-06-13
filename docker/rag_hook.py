"""
MesseBuddy — LiteLLM RAG Pre-Call Hook
=======================================
Registered in litellm.yaml under the `guardrails:` section with mode "pre_call"
and `default_on: true`. That combination means this hook runs before EVERY
/chat/completions request, with zero changes required to the PWA (useChatStream).

What it does:
  1. Extracts the user's latest message from the request.
  2. Embeds it via the configured embedding model.
  3. Queries pgvector for the top-k most similar document chunks.
  4. If relevant chunks found (similarity >= RAG_MIN_SIMILARITY):
       → Injects them into the system prompt as grounding context.
       → Forwards the augmented request to the upstream LLM.
  5. If NO relevant chunks found:
       → Raises an exception with the canned "not in documents" message.
       → The upstream LLM is never called; no provider tokens are consumed.

Registration: litellm.integrations.custom_guardrail.CustomGuardrail
  The `guardrails:` section in litellm.yaml references this class as
  `rag_hook.RAGHook` (module.ClassName, no instance needed).

Config (all via environment variables in docker-compose.yml):
  OPENAI_API_KEY          — used for embeddings; same key as the LLM
  EMBEDDING_MODEL         — embedding model name (default: text-embedding-3-small)
  PGVECTOR_CONNECTION_STRING — postgres DSN for the pgvector service
  RAG_TOP_K               — number of chunks to retrieve per query (default: 5)
  RAG_MIN_SIMILARITY      — cosine similarity threshold 0–1 (default: 0.70)

Docs:
  https://docs.litellm.ai/docs/proxy/guardrails/custom_guardrail
  https://docs.litellm.ai/docs/proxy/call_hooks
"""

import os
import asyncio
from typing import Literal, Optional, Union

import psycopg2
import openai
from litellm.integrations.custom_guardrail import CustomGuardrail
from litellm.caching.caching import DualCache
from litellm.proxy._types import UserAPIKeyAuth
from litellm.types.utils import CallTypes

# ── Configuration ──────────────────────────────────────────────────────────────

OPENAI_API_KEY  = os.environ["OPENAI_API_KEY"]
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
PG_CONN         = os.environ["PGVECTOR_CONNECTION_STRING"]
TOP_K           = int(os.environ.get("RAG_TOP_K", "5"))
MIN_SIMILARITY  = float(os.environ.get("RAG_MIN_SIMILARITY", "0.70"))

# Returned verbatim to the user when no relevant documents exist.
# The LLM is not called in this path — no tokens consumed.
NO_DOCS_RESPONSE = (
    "I can only answer questions based on the company documents I have been "
    "given. That topic is not covered by the current documents. "
    "Please contact HR or your manager for further assistance."
)


# ── Internal helpers (synchronous — run via asyncio.to_thread) ─────────────────

def _embed(text: str) -> list[float]:
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    resp = client.embeddings.create(model=EMBEDDING_MODEL, input=[text])
    return resp.data[0].embedding


def _retrieve(query: str) -> list[tuple[str, str, float]]:
    """
    Returns (source_file, chunk_text, similarity_score) for chunks that
    meet or exceed MIN_SIMILARITY, ordered by relevance (best first).
    """
    emb = _embed(query)
    emb_str = "[" + ",".join(str(x) for x in emb) + "]"

    conn = psycopg2.connect(PG_CONN)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            source,
            content,
            1 - (embedding <=> %s::vector) AS similarity
        FROM doc_chunks
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """,
        (emb_str, emb_str, TOP_K),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [(r[0], r[1], float(r[2])) for r in rows if float(r[2]) >= MIN_SIMILARITY]


def _build_context_block(chunks: list[tuple[str, str, float]]) -> str:
    sections = [f"[Source: {src}]\n{content}" for src, content, _ in chunks]
    return "\n\n---\n\n".join(sections)


# ── Guardrail ──────────────────────────────────────────────────────────────────

class RAGHook(CustomGuardrail):
    """
    Pre-call guardrail implementing strict RAG-only inference.

    Registered in litellm.yaml as:
        guardrails:
          - guardrail_name: "rag-enforcer"
            litellm_params:
              guardrail: rag_hook.RAGHook
              mode: "pre_call"
              default_on: true

    `mode: "pre_call"` routes to async_pre_call_hook.
    `default_on: true` applies this guardrail to ALL requests without
    the client needing to pass "guardrails" in the request body.
    """

    async def async_pre_call_hook(
        self,
        user_api_key_dict: UserAPIKeyAuth,
        cache: DualCache,
        data: dict,
        call_type: Optional[CallTypes],
    ) -> Optional[Union[Exception, str, dict]]:
        """
        Intercepts chat completions, retrieves document context, and either:
          - Augments the system prompt with relevant chunks and returns data, or
          - Raises ValueError with the canned "not in documents" message, which
            LiteLLM surfaces as a 400 error to the client (no LLM call made).

        `data` is the full request body: {"model": ..., "messages": [...], ...}
        Modifying data["messages"] in-place updates what the upstream LLM receives.
        """
        if call_type != "completion":
            return data

        messages: list[dict] = data.get("messages", [])

        # Extract the user's latest message
        user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                content = m.get("content", "")
                if isinstance(content, str):
                    user_msg = content
                break

        if not user_msg.strip():
            return data  # No user text to retrieve for; pass through

        # Run sync psycopg2 call in a thread pool to stay non-blocking
        chunks = await asyncio.to_thread(_retrieve, user_msg)

        if not chunks:
            # No relevant document context — refuse without calling the LLM
            raise ValueError(NO_DOCS_RESPONSE)

        # Inject retrieved context into the system prompt
        context_block = _build_context_block(chunks)
        injection = (
            "\n\n## Retrieved Document Context\n\n"
            f"{context_block}\n\n"
            "---\n"
            "Your answer MUST be based EXCLUSIVELY on the document context above. "
            "Do NOT use general knowledge, training data, or any information not "
            "present in the provided context. "
            "If the context does not contain a clear answer, say so explicitly."
        )

        # Append to existing system message, or prepend a new one
        for m in messages:
            if m.get("role") == "system":
                m["content"] = m["content"] + injection
                return data

        messages.insert(0, {"role": "system", "content": injection.lstrip()})
        return data
