import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity.ts";
import { AdapterContext, resolveUseMockPb } from "./AdapterContextValue.ts";
import { mockAdapter } from "./mock/index.ts";
import { pbAdapter } from "./pocketbase/mod.ts";

interface DemoAwareAdapterProviderProps {
  readonly children: ReactNode;
}

/**
 * Wraps cockpit routes with the correct adapter.
 * Uses mockAdapter when global mock mode is on (dev default) or when ANY
 * profile stored for this session has isDemo: true (production demo paths).
 * The isDemo check handles multiple profiles sharing a sessionId (e.g. a ghost
 * non-demo profile exists alongside the demo profile).
 */
export const DemoAwareAdapterProvider = ({
  children,
}: DemoAwareAdapterProviderProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { profiles } = useIdentity();
  const isDemoSession = profiles.some(
    (p) => p.sessionId === sessionId && p.isDemo,
  );
  const adapter = resolveUseMockPb() || isDemoSession ? mockAdapter : pbAdapter;

  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
};
