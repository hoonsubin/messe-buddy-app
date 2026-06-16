import type { LandingStatus, LandingView } from "../../hooks/useLandingFlow.ts";

interface RecoverViewProps {
  readonly recoveryKey: string;
  readonly recoverySessionId: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly onRecoveryKeyChange: (value: string) => void;
  readonly onRecoverySessionIdChange: (value: string) => void;
  readonly onRecover: () => void;
  readonly onGoToView: (view: LandingView) => void;
}

const RecoverView = ({
  recoveryKey,
  recoverySessionId,
  status,
  errorMessage,
  onRecoveryKeyChange,
  onRecoverySessionIdChange,
  onRecover,
  onGoToView,
}: RecoverViewProps) => (
  <>
    <div className="form-field landing__form-field--compact">
      <label htmlFor="recover-key" className="form-label">
        Recovery key
      </label>
      <input
        id="recover-key"
        type="text"
        className="form-input landing__input-mono"
        placeholder="8-character key"
        value={recoveryKey}
        onChange={(e) => onRecoveryKeyChange(e.target.value)}
        autoCapitalize="characters"
        autoFocus
      />
    </div>
    <div className="form-field landing__form-field">
      <label htmlFor="recover-session" className="form-label">
        Session ID
      </label>
      <input
        id="recover-session"
        type="text"
        className="form-input"
        placeholder="Shared by your Game Master"
        value={recoverySessionId}
        onChange={(e) => onRecoverySessionIdChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onRecover();
        }}
      />
    </div>
    {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
    <div className="landing__actions">
      <button
        type="button"
        className="btn btn--primary landing__btn-full"
        disabled={!recoveryKey.trim() ||
          !recoverySessionId.trim() ||
          status === "loading"}
        onClick={onRecover}
      >
        {status === "loading" ? "Recovering…" : "Restore progress"}
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

export default RecoverView;
