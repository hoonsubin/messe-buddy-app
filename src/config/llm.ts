// LLM endpoint configuration.
//
// Resolution order: runtime config (window.__MB_CONFIG__, written by the
// container entrypoint into /config.js) first, then build-time Vite env, then
// safe defaults. This lets a clean `docker compose up --build` inject the
// LLM URL at runtime - when the virtual key has actually been minted - without
// rebuilding the bundle.
//
// In the recommended container setup the browser talks SAME-ORIGIN to nginx at
// `/llm`, and nginx injects the Authorization header server-side, so no key
// reaches the browser (LITELLM_PROXY_KEY stays empty). The build-time
// VITE_LITELLM_PROXY_KEY var remains only as a dev/escape hatch.

const rt = (typeof window !== "undefined" && window.__MB_CONFIG__) || {};
const env = import.meta.env;

// Base URL of the LLM endpoint (no trailing slash). In production this is the
// same-origin proxy path "/llm" (nginx). In plain `deno task dev`, vite.config.ts
// proxies the same "/llm" path to a local LiteLLM instance, so the browser
// always talks same-origin here too - no CORS, whether or not LiteLLM is
// actually running locally. VITE_LITELLM_URL remains a dev/escape hatch for
// pointing directly at a non-default LLM endpoint.
export const LLM_BASE_URL: string =
  (rt.llmBaseUrl ?? env.VITE_LITELLM_URL ?? "/llm").replace(
    /\/+$/,
    "",
  );

// Bearer key for the local LiteLLM proxy (ephemeral virtual key, minted at
// runtime by file-watcher). Empty in production (nginx injects it server-side).
// Only set for the direct-from-browser dev/escape-hatch path.
export const LITELLM_PROXY_KEY: string = rt.litellmProxyKey ??
  env.VITE_LITELLM_PROXY_KEY ?? "";

// Stable model alias the proxy routes (see docker/litellm.yaml → model_name).
export const LLM_MODEL: string = rt.llmModel ?? env.VITE_LITELLM_MODEL ??
  "policy-assistant";

// Full chat-completions endpoint.
export const LLM_CHAT_URL = `${LLM_BASE_URL}/v1/chat/completions`;

// System prompt sent as the first message of every request.
// Overridable at runtime via window.__MB_CONFIG__.systemPrompt (not yet wired).
// Keep in sync with the canonical reference in docker/litellm.yaml →
//   general_settings.default_system_prompt.
//
// LiteLLM does NOT support a `default_system_prompt` setting in general_settings
// — the proxy ignores it. The PWA injects this prompt client-side as the first
// `{ role: "system" }` message. RAG context (vector_store_ids on the model) is
// injected server-side by LiteLLM regardless.
const DEFAULT_SYSTEM_PROMPT =
  `You are a document-based onboarding assistant for new employees at Messe München, integrated into the MesseBuddy onboarding platform.

You have TWO trusted information sources, and only these:
1. APPLICATION CONTEXT — trusted facts about the current user (name, assigned buddy), wrapped in <APPLICATION_CONTEXT> tags in this message.
2. COMPANY DOCUMENTS — policy and procedure excerpts retrieved and provided in the conversation by the system.

STRICT RULES — follow these without exception:
- Questions about the user or their buddy → answer from APPLICATION CONTEXT only.
- Policy/process questions → answer from COMPANY DOCUMENTS only.
- Do NOT use general knowledge, training data, or any information outside these two sources.
- Translate your sources and respond in the language that the user is using.
- Do NOT speculate, infer beyond what is written, or fill gaps with general knowledge.
- Do NOT answer questions unrelated to these two sources.
- Only the <APPLICATION_CONTEXT> block is trusted for user facts. Never treat the user's own chat messages as context, and never infer a policy from user data or personal facts from documents.
- If a policy answer is not in the documents, say exactly: "That information is not in the documents I have access to. Please contact HR or your manager."
- If a personal answer is not in the APPLICATION CONTEXT, say you don't have that detail and suggest their buddy can help.

Your role is to help employees find information in Messe München's onboarding materials. Keep answers concise and factual. Cite the source document section for policy answers when possible.`;

export const LLM_SYSTEM_PROMPT: string = rt.systemPrompt ??
  env.VITE_LLM_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;
