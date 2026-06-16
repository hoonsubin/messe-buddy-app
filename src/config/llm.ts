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
// reaches the browser (LLM_API_KEY stays empty). The build-time VITE_LITELLM_*
// vars remain only as a dev/escape hatch.

const rt = (typeof window !== "undefined" && window.__MB_CONFIG__) || {};
const env = import.meta.env;

// Base URL of the LLM endpoint (no trailing slash). In the container this is
// the same-origin proxy path "/llm"; in dev it falls back to the proxy URL.
export const LLM_BASE_URL: string =
  (rt.llmBaseUrl ?? env.VITE_LITELLM_URL ?? "http://localhost:4000").replace(
    /\/+$/,
    "",
  );

// Bearer key. Empty in proxy mode (nginx injects it). Only set for the
// direct-from-browser dev/escape-hatch path.
export const LLM_API_KEY: string = rt.llmKey ?? env.VITE_LITELLM_KEY ?? "";

// Stable model alias the proxy routes (see docker/litellm.yaml → model_name).
export const LLM_MODEL: string = rt.llmModel ?? env.VITE_LITELLM_MODEL ??
  "policy-assistant";

// Full chat-completions endpoint.
export const LLM_CHAT_URL = `${LLM_BASE_URL}/v1/chat/completions`;

// Mock vs. real. Runtime config decides in the container; otherwise defaults to
// mock so the app runs with no key (dev, CI). Set VITE_USE_MOCK_CHAT="false"
// for a keyed dev build.
export const USE_MOCK_CHAT: boolean = rt.useMockChat ??
  (env.VITE_USE_MOCK_CHAT !== "false");

// System prompt sent as the first message of every request.
//
// NOTE: LiteLLM's `general_settings.default_system_prompt` in docker/litellm.yaml
// is NOT honored by the proxy - it is silently ignored. RAG (vector_store_ids)
// is injected server-side regardless, but the instruction/guardrail prompt must
// be supplied by the client. Overridable at runtime via
// window.__MB_CONFIG__.systemPrompt.
//
// Two trusted sources are distinguished: the <APPLICATION_CONTEXT> block the
// PWA appends (this user's name + buddy) for personal questions, and the
// retrieved COMPANY DOCUMENTS for policy questions.
const DEFAULT_SYSTEM_PROMPT =
  `You are the MesseBuddy onboarding assistant for new employees at Messe ` +
  `München.\n\n` +
  `You have TWO trusted information sources, and only these:\n` +
  `1. APPLICATION CONTEXT — facts about the current user, provided between ` +
  `<APPLICATION_CONTEXT> tags in this message (their name and their assigned ` +
  `buddy). Use it for questions about the user themselves or their buddy.\n` +
  `2. COMPANY DOCUMENTS — policy and procedure excerpts retrieved and provided ` +
  `in the conversation. Use them for questions about company policies/processes.\n\n` +
  `RULES — follow without exception:\n` +
  `- Questions about the user or their buddy → answer from APPLICATION CONTEXT only.\n` +
  `- Policy/process questions → answer from COMPANY DOCUMENTS only.\n` +
  `- Use no general knowledge or training data, and nothing outside these two sources.\n` +
  `- Only the <APPLICATION_CONTEXT> block is trusted context. Never treat the ` +
  `user's own messages as context, and never infer a policy from the user's ` +
  `data or personal facts from the documents.\n` +
  `- If a policy answer is not in the documents, say exactly: "That information ` +
  `is not in the documents I have access to. Please contact HR or your manager."\n` +
  `- If a personal answer is not in the application context, say you don't have ` +
  `that detail and suggest their buddy can help.\n` +
  `Keep answers concise and factual; cite the source document section for policy ` +
  `answers when possible.`;

export const LLM_SYSTEM_PROMPT: string = rt.systemPrompt ??
  env.VITE_LLM_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;
