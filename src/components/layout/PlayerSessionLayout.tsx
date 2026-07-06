import type { ReactNode } from "react";
import { DemoAwareAdapterProvider } from "../../adapters/DemoAwareAdapterProvider.tsx";
import { USER_ROLE } from "../../types/index.ts";
import RequireRole from "./RequireRole.tsx";

interface PlayerSessionLayoutProps {
  readonly children: ReactNode;
}

const PlayerSessionLayout = ({ children }: PlayerSessionLayoutProps) => (
  <RequireRole role={USER_ROLE.PLAYER}>
    <DemoAwareAdapterProvider>
      {children}
    </DemoAwareAdapterProvider>
  </RequireRole>
);

export default PlayerSessionLayout;
