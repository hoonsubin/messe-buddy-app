import type { ChangeEvent, RefObject } from "react";
import type { LandingStatus, LandingView } from "../../hooks/useLandingFlow.ts";

interface CreateSessionViewProps {
  readonly sessionName: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly templateFileRef: RefObject<HTMLInputElement | null>;
  readonly onSessionNameChange: (value: string) => void;
  readonly onCreate: () => void;
  readonly onTemplateImport: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly onGoToView: (view: LandingView) => void;
}

const CreateSessionView = ({
  sessionName,
  status,
  errorMessage,
  templateFileRef,
  onSessionNameChange,
  onCreate,
  onTemplateImport,
  onGoToView,
}: CreateSessionViewProps) => (
  <>
    <div className="form-field landing__form-field">
      <label htmlFor="session-name" className="form-label">
        Session name
      </label>
      <input
        id="session-name"
        type="text"
        className="form-input"
        placeholder="e.g. Munich Onboarding June 2026"
        value={sessionName}
        onChange={(e) => onSessionNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCreate();
        }}
        autoFocus
      />
    </div>
    {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
    <div className="landing__actions">
      <button
        type="button"
        className="btn btn--primary landing__btn-full"
        disabled={!sessionName.trim() || status === "loading"}
        onClick={onCreate}
      >
        {status === "loading" ? "Creating…" : "Create session"}
      </button>
      <button
        type="button"
        className="btn btn--ghost landing__btn-full"
        onClick={() => onGoToView("role-select")}
      >
        Back
      </button>
    </div>

    <div className="landing__divider">
      <div className="landing__divider-line" />
      <span className="landing__divider-label">or</span>
      <div className="landing__divider-line" />
    </div>
    <input
      ref={templateFileRef}
      type="file"
      accept="application/json,.json"
      className="landing__file-input"
      onChange={onTemplateImport}
    />
    <button
      type="button"
      className="btn btn--ghost landing__btn-muted"
      disabled={status === "loading"}
      onClick={() => templateFileRef.current?.click()}
    >
      {status === "loading" ? "Importing…" : "Import from template"}
    </button>
    <button
      type="button"
      className="btn btn--ghost landing__btn-muted"
      disabled={status === "loading"}
      onClick={() => onGoToView("templates")}
    >
      Browse Templates
    </button>
  </>
);

export default CreateSessionView;
