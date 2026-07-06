import { createContext } from "react";
import type { QueryClient } from "./queryClient.ts";

export const QueryContext = createContext<QueryClient | null>(null);
