import type { ReactNode } from "react";
import type { AppAdapter } from "./interface.ts";
import { mockAdapter } from "./mock/index.ts";
import { pbAdapter } from "./pocketbase/mod.ts";
import { AdapterContext } from "./AdapterContextValue.ts";

// ── Provider ──────────────────────────────────────────────────────────────────

interface AdapterContextProviderProps {
  readonly adapter?: AppAdapter;
  readonly children: ReactNode;
}

const resolveUseMockPb = (): boolean => {
  const rt = typeof window !== "undefined" && window.__MB_CONFIG__ || {};
  if (rt.useMockPb !== undefined) return rt.useMockPb;
  // Default: true (safe — mock adapter, no backend required)
  return import.meta.env.VITE_USE_MOCK_PB !== "false";
};

export const AdapterContextProvider = ({
  adapter = resolveUseMockPb() ? mockAdapter : pbAdapter,
  children,
}: AdapterContextProviderProps) => {
  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
};
