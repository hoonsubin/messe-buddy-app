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

const USE_MOCK_PB = import.meta.env.VITE_USE_MOCK_PB === "true";

export const AdapterContextProvider = ({
  adapter = USE_MOCK_PB ? mockAdapter : pbAdapter,
  children,
}: AdapterContextProviderProps) => {
  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
};
