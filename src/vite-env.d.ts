/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PB_URL?: string;
  readonly VITE_USE_MOCK_PB?: string;
  readonly VITE_LITELLM_URL?: string;
  readonly VITE_LITELLM_KEY?: string;
  readonly VITE_LITELLM_MODEL?: string;
  readonly VITE_USE_MOCK_CHAT?: string;
  readonly VITE_LLM_SYSTEM_PROMPT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Runtime config injected by the container entrypoint via /config.js.
interface MesseBuddyRuntimeConfig {
  readonly llmBaseUrl?: string;
  readonly llmKey?: string;
  readonly llmModel?: string;
  readonly useMockChat?: boolean;
  readonly useMockPb?: boolean;
  readonly systemPrompt?: string;
  readonly pbUrl?: string;
}

interface Window {
  __MB_CONFIG__?: MesseBuddyRuntimeConfig;
}
