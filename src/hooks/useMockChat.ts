import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, UseChatReturn } from "./useChatStream.ts";

// ── Keyword-matched policy responses ──────────────────────────────────────
const POLICY_RESPONSES: Readonly<Record<string, string>> = {
  "home office":
    "Our home office policy allows employees to work remotely up to 3 days per week. You'll need manager approval for full-time remote arrangements. All remote work equipment (monitor, keyboard, headset) can be ordered through the IT portal during your first week.",
  "work from home":
    "Our home office policy allows employees to work remotely up to 3 days per week. You'll need manager approval for full-time remote arrangements. All remote work equipment (monitor, keyboard, headset) can be ordered through the IT portal during your first week.",
  "from home":
    "Our home office policy allows employees to work remotely up to 3 days per week. You'll need manager approval for full-time remote arrangements. All remote work equipment (monitor, keyboard, headset) can be ordered through the IT portal during your first week.",
  remote:
    "Our home office policy allows employees to work remotely up to 3 days per week. You'll need manager approval for full-time remote arrangements. All remote work equipment (monitor, keyboard, headset) can be ordered through the IT portal during your first week.",
  vacation:
    "You're entitled to **25 vacation days per year**, accrued monthly. A few things to know:\n\n- Submit requests through the **HR portal** at least 2 weeks in advance\n- Up to **5 unused days** can be carried into the next year\n- Public holidays are additional and don't count against your allowance",
  holiday:
    "You're entitled to **25 vacation days per year**, accrued monthly. A few things to know:\n\n- Submit requests through the **HR portal** at least 2 weeks in advance\n- Up to **5 unused days** can be carried into the next year\n- Public holidays are additional and don't count against your allowance",
  leave:
    "You're entitled to **25 vacation days per year**, accrued monthly. A few things to know:\n\n- Submit requests through the **HR portal** at least 2 weeks in advance\n- Up to **5 unused days** can be carried into the next year\n- Public holidays are additional and don't count against your allowance",
  expense:
    "Expense reports are submitted through the finance portal. Receipts are required for purchases over €25. Reimbursements are processed within 2 weeks. The corporate credit card is available for frequent travelers - speak with your manager to request one.",
  reimburse:
    "Expense reports are submitted through the finance portal. Receipts are required for purchases over €25. Reimbursements are processed within 2 weeks. The corporate credit card is available for frequent travelers - speak with your manager to request one.",
  "first day":
    "On your first day, arrive by 9:00 AM at the reception desk. You'll be greeted by your buddy who will give you a tour, help you set up your workstation, and walk you through the onboarding portal. Lunch is on us - your buddy will take you to a welcome lunch with the team.",
  onboarding:
    "On your first day, arrive by 9:00 AM at the reception desk. You'll be greeted by your buddy who will give you a tour, help you set up your workstation, and walk you through the onboarding portal. Lunch is on us - your buddy will take you to a welcome lunch with the team.",
  buddy:
    "Every new hire is assigned a buddy - an experienced colleague who helps you navigate your first weeks. Your buddy will introduce you to the team, answer questions, and help you complete your onboarding missions. You can find your buddy's contact info in the Buddy section of your dashboard.",
};

const FALLBACK_RESPONSE =
  "I don't have a specific answer for that - try one of the suggested questions, or check the Resources block below.";

const TYPING_DELAY_MIN_MS = 800;
const TYPING_DELAY_MAX_MS = 1200;

function matchResponse(query: string): string {
  const lower = query.toLowerCase();
  for (const [keyword, response] of Object.entries(POLICY_RESPONSES)) {
    if (lower.includes(keyword)) return response;
  }
  return FALLBACK_RESPONSE;
}

function randomDelayMs(): number {
  return TYPING_DELAY_MIN_MS +
    Math.random() * (TYPING_DELAY_MAX_MS - TYPING_DELAY_MIN_MS);
}

// Mock chat that mirrors the live hook's shape (UseChatReturn) so the two are
// interchangeable. Appends an empty streaming placeholder, then fills it after a
// short delay - exercising the same typing-indicator path as the real stream.
export function useMockChat(): UseChatReturn {
  const [messages, setMessages] = useState<ReadonlyArray<ChatMessage>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || streamingRef.current) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const placeholder: ChatMessage = {
      role: "assistant",
      content: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setIsStreaming(true);
    streamingRef.current = true;

    timerRef.current = setTimeout(() => {
      const response = matchResponse(trimmed);
      setMessages((prev) => {
        const next = prev.slice();
        const last = next[next.length - 1]!;
        next[next.length - 1] = {
          ...last,
          content: response,
          streaming: false,
        };
        return next;
      });
      setIsStreaming(false);
      streamingRef.current = false;
      timerRef.current = null;
    }, randomDelayMs());
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice();
      const last = next[next.length - 1]!;
      if (last.role === "assistant" && last.streaming) {
        next[next.length - 1] = {
          ...last,
          content: last.content || "(stopped)",
          streaming: false,
        };
      }
      return next;
    });
    setIsStreaming(false);
    streamingRef.current = false;
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setMessages([]);
    setIsStreaming(false);
    streamingRef.current = false;
  }, []);

  return { messages, isStreaming, error: null, send, stop, clear };
}
