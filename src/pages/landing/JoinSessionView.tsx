import type { LandingStatus, LandingView } from "../../hooks/useLandingFlow.ts";

interface JoinSessionViewProps {
  readonly sessionCode: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly onSessionCodeChange: (value: string) => void;
  readonly onJoin: () => void;
  readonly onGoToView: (view: LandingView) => void;
}

const JoinSessionView = ({
  sessionCode,
  status,
  errorMessage,
  onSessionCodeChange,
  onJoin,
  onGoToView,
}: JoinSessionViewProps) => (
  <>
    <div className="form-field landing__form-field">
      <label htmlFor="session-code" className="form-label">
        Session code
      </label>
      <input
        id="session-code"
        type="text"
        className="form-input"
        placeholder="Ask your Game Master for the code"
        value={sessionCode}
        onChange={(e) => onSessionCodeChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onJoin();
        }}
        autoFocus
      />
    </div>
    {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
    <div className="landing__actions">
      <button
        type="button"
        className="btn btn--primary landing__btn-full"
        disabled={!sessionCode.trim() || status === "loading"}
        onClick={onJoin}
      >
        {status === "loading" ? "Joining…" : "Join session"}
      </button>
      <button
        type="button"
        className="btn btn--ghost landing__btn-full"
        onClick={() => onGoToView("role-select")}
      >
        Back
      </button>
    </div>
  </>
);

export default JoinSessionView;
