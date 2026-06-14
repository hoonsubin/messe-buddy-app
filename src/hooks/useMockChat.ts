import { useState, useCallback } from "react";
import type { ChatMessage } from "./useChatStream.ts";

// ── Keyword-matched policy responses ──────────────────────────────────────
const POLICY_RESPONSES: Readonly<Record<string, string>> = {
  "home office":
    "Our home office policy allows employees to work remotely up to 3 days per week. You'll need manager approval for full-time remote arrangements. All remote work equipment (monitor, keyboard, headset) can be ordered through the IT portal during your first week.",
  remote:
    "Our home office policy allows employees to work remotely up to 3 days per week. You'll need manager approval for full-time remote arrangements. All remote work equipment (monitor, keyboard, headset) can be ordered through the IT portal during your first week.",
  vacation:
    "You're entitled to 25 vacation days per year, accrued monthly. Vacation requests should be submitted through the HR portal at least 2 weeks in advance. Unused days can be carried over up to 5 days into the next year.",
  holiday:
    "You're entitled to 25 vacation days per year, accrued monthly. Vacation requests should be submitted through the HR portal at least 2 weeks in advance. Unused days can be carried over up to 5 days into the next year.",
  leave:
    "You're entitled to 25 vacation days per year, accrued monthly. Vacation requests should be submitted through the HR portal at least 2 weeks in advance. Unused days can be carried over up to 5 days into the next year.",
  expense:
    "Expense reports are submitted through the finance portal. Receipts are required for purchases over €25. Reimbursements are processed within 2 weeks. The corporate credit card is available for frequent travelers — speak with your manager to request one.",
  reimburse:
    "Expense reports are submitted through the finance portal. Receipts are required for purchases over €25. Reimbursements are processed within 2 weeks. The corporate credit card is available for frequent travelers — speak with your manager to request one.",
  "first day":
    "On your first day, arrive by 9:00 AM at the reception desk. You'll be greeted by your buddy who will give you a tour, help you set up your workstation, and walk you through the onboarding portal. Lunch is on us — your buddy will take you to a welcome lunch with the team.",
  onboarding:
    "On your first day, arrive by 9:00 AM at the reception desk. You'll be greeted by your buddy who will give you a tour, help you set up your workstation, and walk you through the onboarding portal. Lunch is on us — your buddy will take you to a welcome lunch with the team.",
  buddy:
    "Every new hire is assigned a buddy — an experienced colleague who helps you navigate your first weeks. Your buddy will introduce you to the team, answer questions, and help you complete your onboarding missions. You can find your buddy's contact info in the Buddy section of your dashboard.",
};

const FALLBACK_RESPONSE =
  "I don't have a specific answer for that, but you can find it in the Resources section below.";

const TYPING_DELAY_MIN_MS = 800;
const TYPING_DELAY_MAX_MS = 1200;

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Types ──────────────────────────────────────────────────────────────────

export interface UseMockChatOptions {
  readonly resources?: ReadonlyArray<
    { readonly id: string; readonly title: string }
  >;
}

export interface UseMockChatReturn {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly isStreaming: boolean;
  readonly send: (text: string) => void;
  readonly clear: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-unused-vars */
export function useMockChat(
  _options?: UseMockChatOptions,
): UseMockChatReturn {
  const [messages, setMessages] = useState<ReadonlyArray<ChatMessage>>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const delay = randomDelayMs();
    setTimeout(() => {
      const response = matchResponse(trimmed);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(false);
    }, delay);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, send, clear };
}
