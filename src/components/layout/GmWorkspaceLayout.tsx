import type { ReactNode } from "react";
import { DemoAwareAdapterProvider } from "../../adapters/DemoAwareAdapterProvider.tsx";
import { USER_ROLE } from "../../types/index.ts";
import RequireRole from "./RequireRole.tsx";

interface GmWorkspaceLayoutProps {
  readonly children: ReactNode;
}

const GmWorkspaceLayout = ({ children }: GmWorkspaceLayoutProps) => (
  <RequireRole role={USER_ROLE.GAMEMAKER}>
    <DemoAwareAdapterProvider>
      {children}
    </DemoAwareAdapterProvider>
  </RequireRole>
);

export default GmWorkspaceLayout;
