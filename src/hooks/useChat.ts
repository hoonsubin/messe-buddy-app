// Selector hook - returns the live streaming chat or the offline mock based on
// the build-time VITE_USE_MOCK_CHAT flag. Both hooks are called unconditionally
// (rules-of-hooks safe); only the selected result is returned. The flag is a
// build constant, so the branch never flips at runtime.

import { useMockChat } from "./useMockChat.ts";
import { type UseChatReturn, useChatStream } from "./useChatStream.ts";
import { USE_MOCK_CHAT } from "../config/llm.ts";

export type { ChatMessage, UseChatReturn } from "./useChatStream.ts";

export function useChat(): UseChatReturn {
  const mock = useMockChat();
  const live = useChatStream();
  return USE_MOCK_CHAT ? mock : live;
}
