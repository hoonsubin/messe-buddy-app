import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AppAdapter } from "./interface.ts";
import { mockAdapter } from "./mock/index.ts";

// ── Context ───────────────────────────────────────────────────────────────────

const AdapterContext = createContext<AppAdapter>(mockAdapter);

// ── Provider ──────────────────────────────────────────────────────────────────

interface AdapterContextProviderProps {
  readonly adapter?: AppAdapter;
  readonly children: ReactNode;
}

export function AdapterContextProvider({
  adapter = mockAdapter,
  children,
}: AdapterContextProviderProps) {
  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAdapter(): AppAdapter {
  return useContext(AdapterContext);
}
