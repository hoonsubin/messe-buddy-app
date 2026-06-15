import { createContext } from "react";
import type { AppAdapter } from "./interface.ts";
import { mockAdapter } from "./mock/index.ts";

export const AdapterContext = createContext<AppAdapter>(mockAdapter);
