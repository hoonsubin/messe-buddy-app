import { useCallback, useEffect, useRef, useState } from "react";
import type { PreBoardingCheckItem, Session } from "../types/index.ts";
import type { AppAdapter } from "../adapters/interface.ts";
import { makeId } from "../utils/id.ts";

interface UsePreBoardingChecklistResult {
  readonly items: ReadonlyArray<PreBoardingCheckItem>;
  readonly onToggle: (id: string) => void;
  readonly onAdd: (label: string) => void;
  readonly onMarkAllDone: () => void;
}

/**
 * Manages the pre-boarding checklist for a session.
 * Seeds from session.preBoardingChecks on first load and keeps the adapter
 * in sync on every mutation.
 */
export const usePreBoardingChecklist = (
  sid: string,
  session: Session | null,
  adapter: AppAdapter,
): UsePreBoardingChecklistResult => {
  const [items, setItems] = useState<ReadonlyArray<PreBoardingCheckItem>>([]);
  const prevSessionRef = useRef<Session | null>(null);

  // Seed from session on first load / when session changes reference
  useEffect(() => {
    if (session && session !== prevSessionRef.current) {
      prevSessionRef.current = session;
      setItems(session.preBoardingChecks);
    }
  }, [session]);

  const onToggle = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        );
        void adapter.updateSession(sid, { preBoardingChecks: next });
        return next;
      });
    },
    [adapter, sid],
  );

  const onAdd = useCallback(
    (label: string) => {
      setItems((prev) => {
        const newItem: PreBoardingCheckItem = {
          id: makeId(),
          label,
          checked: false,
        };
        const next = [...prev, newItem];
        void adapter.updateSession(sid, { preBoardingChecks: next });
        return next;
      });
    },
    [adapter, sid],
  );

  const onMarkAllDone = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, checked: true }));
      void adapter.updateSession(sid, { preBoardingChecks: next });
      return next;
    });
  }, [adapter, sid]);

  return { items, onToggle, onAdd, onMarkAllDone };
};
