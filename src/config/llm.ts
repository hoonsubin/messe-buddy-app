// LLM endpoint configuration.
//
// Resolution order: runtime config (window.__MB_CONFIG__, written by the
// container entrypoint into /config.js) first, then build-time Vite env, then
// safe defaults. This lets a clean `docker compose up --build` inject the
// LLM URL at runtime — when the virtual key has actually been minted — without
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
// is NOT honored by the proxy — it is silently ignored. RAG (vector_store_ids)
// is injected server-side regardless, but the instruction/guardrail prompt must
// be supplied by the client. Keep this in sync with litellm.yaml's documented
// prompt. Overridable at runtime via window.__MB_CONFIG__.systemPrompt.
const DEFAULT_SYSTEM_PROMPT =
  `You are a document-based onboarding assistant for new employees at Messe ` +
  `München, integrated into the MesseBuddy onboarding platform.\n\n` +
  `STRICT RULES — follow these without exception:\n` +
  `- Answer ONLY from the company documents provided to you in this conversation.\n` +
  `- Do NOT use general knowledge, training data, or any information not in the provided documents.\n` +
  `- If the provided documents do not contain a clear answer, say exactly: "That information is not in the documents I have access to. Please contact HR or your manager."\n` +
  `- Do NOT speculate, infer beyond what is written, or fill gaps with general knowledge.\n` +
  `- Do NOT answer questions unrelated to the provided company documents.\n\n` +
  `Your role is to help employees find information in Messe München's onboarding ` +
  `materials. Keep answers concise and factual. Cite the source document section ` +
  `when possible.`;

export const LLM_SYSTEM_PROMPT: string = rt.systemPrompt ??
  env.VITE_LLM_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;
