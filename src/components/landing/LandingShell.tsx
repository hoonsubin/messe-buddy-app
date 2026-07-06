import type { ReactNode } from "react";

interface LandingShellProps {
  readonly children: ReactNode;
}

const LandingShell = ({ children }: LandingShellProps) => (
  <div
    className="landing landing--grid-bg landing--profiles"
    data-testid="landing-page"
    data-page="landing"
  >
    <div className="landing__brand">
      <div className="landing__brand-mark" aria-hidden="true">MM</div>
      <div>
        <span className="landing__brand-name">MesseBuddy</span>
        <p className="landing__brand-tagline">Messe München onboarding</p>
      </div>
    </div>

    {children}

    <p className="landing__footer">
      Having trouble?{" "}
      <a href="mailto:it@messe-muenchen.de" className="landing__footer-link">
        Contact IT support
      </a>
    </p>
  </div>
);

export default LandingShell;
