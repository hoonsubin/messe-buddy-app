import { createContext } from "react";
import type { AppAdapter } from "./interface.ts";
import { mockAdapter } from "./mock/index.ts";
import { pbAdapter } from "./pocketbase/mod.ts";

export const resolveUseMockPb = (): boolean => {
  const rt = typeof window !== "undefined" && window.__MB_CONFIG__ || {};
  if (rt.useMockPb !== undefined) return rt.useMockPb;
  // Default: true (safe — mock adapter, no backend required)
  return import.meta.env.VITE_USE_MOCK_PB !== "false";
};

export const AdapterContext = createContext<AppAdapter>(
  resolveUseMockPb() ? mockAdapter : pbAdapter,
);
