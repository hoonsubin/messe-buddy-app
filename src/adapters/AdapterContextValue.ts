import { createContext } from "react";
import type { AppAdapter } from "./interface.ts";
import { mockAdapter } from "./mock/index.ts";
import { pbAdapter } from "./pocketbase/mod.ts";

const USE_MOCK_PB = import.meta.env.VITE_USE_MOCK_PB === "true";

export const AdapterContext = createContext<AppAdapter>(
  USE_MOCK_PB ? mockAdapter : pbAdapter,
);
