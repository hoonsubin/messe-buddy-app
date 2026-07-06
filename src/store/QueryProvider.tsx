import { type ReactNode, useMemo } from "react";
import { QueryContext } from "./QueryContext.ts";
import { createQueryClient } from "./queryClient.ts";

interface QueryProviderProps {
  readonly children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  const client = useMemo(() => createQueryClient(), []);

  return (
    <QueryContext.Provider value={client}>
      {children}
    </QueryContext.Provider>
  );
};
