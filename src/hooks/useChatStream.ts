// Phase 1 shell — interface only. AI streaming wired in Phase 6.
// This hook will call the Deno backend's /chat SSE endpoint.

// Local message shape (domain ChatMessage type deferred to Phase 8).
export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly streaming?: boolean;
}

export interface UseChatStreamReturn {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly isStreaming: boolean;
  readonly send: (content: string) => void;
  readonly clear: () => void;
}

// Stub: returns empty state. Real implementation replaces this in Phase 6.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useChatStream = (_sessionId: string): UseChatStreamReturn => {
  // Phase 6: replace with useState + EventSource SSE implementation.
  return {
    messages: [],
    isStreaming: false,
    send: (_content: string) => undefined,
    clear: () => undefined,
  };
};
