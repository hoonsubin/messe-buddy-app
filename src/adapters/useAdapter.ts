import { useContext } from "react";
import { AdapterContext } from "./AdapterContextValue.ts";
import type { AppAdapter } from "./interface.ts";

export const useAdapter = (): AppAdapter => {
  return useContext(AdapterContext);
};
