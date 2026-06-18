import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity.ts";
import { AdapterContext } from "./AdapterContextValue.ts";
import { mockAdapter } from "./mock/index.ts";
import { pbAdapter } from "./pocketbase/mod.ts";

interface DemoAwareAdapterProviderProps {
  readonly children: ReactNode;
}

/**
 * Wraps cockpit routes with the correct adapter.
 * If ANY profile stored for this session has isDemo: true, use mockAdapter
 * so all data comes from local mock data rather than PocketBase.
 * This handles the case where multiple profiles share a sessionId (e.g. a
 * ghost non-demo profile exists alongside the demo profile).
 */
export const DemoAwareAdapterProvider = ({
  children,
}: DemoAwareAdapterProviderProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { profiles } = useIdentity();
  const isDemoSession = profiles.some(
    (p) => p.sessionId === sessionId && p.isDemo,
  );
  const adapter = isDemoSession ? mockAdapter : pbAdapter;

  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  );
};
