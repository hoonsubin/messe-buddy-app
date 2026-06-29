// Selector hook - returns the live streaming chat or the offline mock based
// on whether the LiteLLM backend is actually reachable right now (see
// useAssistantAvailability). Both hooks are called unconditionally
// (rules-of-hooks safe); only the selected result is returned. There is no
// build-time mock/live flag - the same bundle adapts at runtime, so a
// no-backend static deploy (e.g. GitHub Pages) falls back to mock
// automatically instead of needing a separate build.

import { useMockChat } from "./useMockChat.ts";
import { type UseChatReturn, useChatStream } from "./useChatStream.ts";
import { useAssistantAvailability } from "./useAssistantAvailability.ts";

export type { ChatMessage, UseChatReturn } from "./useChatStream.ts";

export interface UseChatWithAvailability extends UseChatReturn {
  // True when serving the mock fallback because the live assistant is
  // unreachable (or the reachability check hasn't resolved yet).
  readonly assistantUnavailable: boolean;
}

export function useChat(appContext?: string): UseChatWithAvailability {
  const available = useAssistantAvailability();
  const mock = useMockChat();
  const live = useChatStream(appContext);
  return available
    ? { ...live, assistantUnavailable: false }
    : { ...mock, assistantUnavailable: true };
}
