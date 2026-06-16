import type { LandingView } from "../../hooks/useLandingFlow.ts";

interface RoleSelectViewProps {
  readonly onGoToView: (view: LandingView) => void;
  readonly onDemoPlayer: () => void;
  readonly onDemoAdmin: () => void;
}

const RoleSelectView = ({
  onGoToView,
  onDemoPlayer,
  onDemoAdmin,
}: RoleSelectViewProps) => (
  <>
    <p className="landing__section-label">Join as</p>
    <div className="landing__stack">
      <button
        type="button"
        className="btn btn--primary landing__btn-full"
        onClick={() => onGoToView("join")}
      >
        New Employee
      </button>
      <button
        type="button"
        className="btn btn--secondary landing__btn-full"
        onClick={() => onGoToView("create")}
      >
        Admin
      </button>
    </div>
    <hr className="landing__rule" />
    <button
      type="button"
      className="btn btn--ghost landing__btn-muted"
      onClick={() => onGoToView("recover")}
    >
      Recover my progress
    </button>

    <div className="landing__divider">
      <div className="landing__divider-line" />
      <span className="landing__divider-label">demo</span>
      <div className="landing__divider-line" />
    </div>
    <div className="landing__demo-row">
      <button
        type="button"
        className="btn btn--ghost landing__btn-demo"
        onClick={onDemoPlayer}
      >
        As Employee
      </button>
      <button
        type="button"
        className="btn btn--ghost landing__btn-demo"
        onClick={onDemoAdmin}
      >
        As Admin
      </button>
    </div>
  </>
);

export default RoleSelectView;
