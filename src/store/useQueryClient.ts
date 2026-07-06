import { useContext } from "react";
import { QueryContext } from "./QueryContext.ts";
import type { QueryClient } from "./queryClient.ts";

export const useQueryClient = (): QueryClient => {
  const client = useContext(QueryContext);
  if (!client) {
    throw new Error("useQueryClient must be used within QueryProvider");
  }
  return client;
};
