import type { ReactNode } from "react";
import type { LandingView } from "../../hooks/useLandingFlow.ts";
import { LANDING_SUBTITLES } from "./landingCopy.ts";

interface LandingShellProps {
  readonly view: LandingView;
  readonly children: ReactNode;
}

const LandingShell = ({ view, children }: LandingShellProps) => (
  <div
    className="landing landing--grid-bg"
    data-testid="landing-page"
    data-page="landing"
  >
    <div className="landing__brand">
      <div className="landing__brand-mark" aria-hidden="true">
        MM
      </div>
      <span className="landing__brand-name">Messe München</span>
    </div>

    <div className="landing__headline">
      <h1 className="landing__title">Employee Onboarding</h1>
      {LANDING_SUBTITLES[view] !== undefined && (
        <p className="landing__subtitle">{LANDING_SUBTITLES[view]}</p>
      )}
    </div>

    <div className="landing__card">{children}</div>

    <p className="landing__footer">
      Having trouble?{" "}
      <a
        href="mailto:it@messe-muenchen.de"
        className="landing__footer-link"
      >
        Contact IT Support
      </a>
    </p>
  </div>
);

export default LandingShell;
