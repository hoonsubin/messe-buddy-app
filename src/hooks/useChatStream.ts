// Streaming chat client for the LiteLLM OpenAI-compatible endpoint.
//
// The PWA is intentionally "dumb": it POSTs the conversation to
// /v1/chat/completions with stream:true and renders the streamed tokens. The
// model alias, system prompt, and RAG vector store are all configured
// server-side (docker/litellm.yaml) - nothing about them lives here.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LLM_API_KEY,
  LLM_CHAT_URL,
  LLM_MODEL,
  LLM_SYSTEM_PROMPT,
} from "../config/llm.ts";

// Local message shape (domain ChatMessage type deferred to Phase 8).
export interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly streaming?: boolean;
  readonly isError?: boolean;
}

// Shared return shape - implemented by both the live and mock hooks so the
// `useChat` selector can swap them transparently.
export interface UseChatReturn {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly isStreaming: boolean;
  readonly error: string | null;
  readonly send: (content: string) => void;
  readonly stop: () => void;
  readonly clear: () => void;
}

const ERROR_MESSAGE =
  "Sorry - I couldn't reach the assistant just now. Please try again in a moment.";

// Parse an OpenAI-style SSE chunk buffer, returning the text delta and whether
// the [DONE] sentinel was seen. Leftover (incomplete) data stays in `rest`.
interface ParsedChunk {
  readonly delta: string;
  readonly done: boolean;
  readonly rest: string;
}

function drainSSE(buffer: string): ParsedChunk {
  let delta = "";
  let done = false;
  const lines = buffer.split("\n");
  // Last element may be a partial line - keep it for the next read.
  const rest = lines.pop() ?? "";

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "" || !line.startsWith("data:")) continue;
    const payload = line.slice("data:".length).trim();
    if (payload === "[DONE]") {
      done = true;
      continue;
    }
    try {
      const json = JSON.parse(payload);
      const piece = json?.choices?.[0]?.delta?.content;
      if (typeof piece === "string") delta += piece;
    } catch {
      // Ignore keep-alive / non-JSON lines.
    }
  }
  return { delta, done, rest };
}

export const useChatStream = (): UseChatReturn => {
  const [messages, setMessages] = useState<ReadonlyArray<ChatMessage>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<ReadonlyArray<ChatMessage>>(messages);
  const streamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Append a text delta to the trailing (streaming) assistant message.
  const appendToLast = useCallback((delta: string) => {
    if (!delta) return;
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice();
      const last = next[next.length - 1]!;
      next[next.length - 1] = { ...last, content: last.content + delta };
      return next;
    });
  }, []);

  const finishLast = useCallback((patch?: Partial<ChatMessage>) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice();
      const last = next[next.length - 1]!;
      next[next.length - 1] = { ...last, streaming: false, ...patch };
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || streamingRef.current) return;

    setError(null);
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const placeholder: ChatMessage = {
      role: "assistant",
      content: "",
      streaming: true,
    };

    // Build the request from existing turns plus this user message, prefixed
    // with the system prompt (LiteLLM does not inject one - see config/llm.ts).
    const history = [...messagesRef.current, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const requestMessages = LLM_SYSTEM_PROMPT
      ? [{ role: "system", content: LLM_SYSTEM_PROMPT }, ...history]
      : history;

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setIsStreaming(true);
    streamingRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      try {
        const res = await fetch(LLM_CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            model: LLM_MODEL,
            messages: requestMessages,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`LLM request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = drainSSE(buffer);
          buffer = parsed.rest;
          if (parsed.delta) appendToLast(parsed.delta);
          if (parsed.done) streamDone = true;
        }

        // If the model returned nothing, surface a gentle note rather than an
        // empty bubble.
        const last = messagesRef.current[messagesRef.current.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          finishLast({
            content:
              "I didn't get a response. Please rephrase or try again shortly.",
          });
        } else {
          finishLast();
        }
      } catch (e) {
        if (controller.signal.aborted) {
          // User stopped generation - keep whatever streamed so far.
          finishLast();
        } else {
          setError(ERROR_MESSAGE);
          finishLast({ content: ERROR_MESSAGE, isError: true });
        }
      } finally {
        setIsStreaming(false);
        streamingRef.current = false;
        abortRef.current = null;
      }
    };

    void run();
  }, [appendToLast, finishLast]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, send, stop, clear };
};
