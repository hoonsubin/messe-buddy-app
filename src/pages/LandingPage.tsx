import RecoveryKeyModal from "../components/shared/RecoveryKeyModal.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";
import { useLandingFlow } from "../hooks/useLandingFlow.ts";
import type { LandingView } from "../hooks/useLandingFlow.ts";

const LandingPage = () => {
  const {
    view,
    status,
    errorMessage,
    sessionCode,
    sessionName,
    recoveryKey,
    recoverySessionId,
    templates,
    pendingRecoveryKey,
    pendingPlayer,
    templateFileRef,
    setView,
    setSessionCode,
    setSessionName,
    setRecoveryKey,
    setRecoverySessionId,
    resetError,
    handleJoin,
    handleCreate,
    handleRecover,
    handleNameSubmit,
    handleDemoPlayer,
    handleDemoAdmin,
    handleLoadTemplateFromStore,
    handleTemplateImport,
    handleRecoveryKeyDismiss,
  } = useLandingFlow();

  const goToView = (next: LandingView) => {
    resetError();
    setView(next);
  };

  return (
    <>
      <div
        className="landing landing--grid-bg"
        data-testid="landing-page"
        data-page="landing"
      >
        {/* Messe München logotype */}
        <div className="landing__brand">
          <div className="landing__brand-mark" aria-hidden="true">
            MM
          </div>
          <span className="landing__brand-name">Messe München</span>
        </div>

        {/* Headline */}
        <div className="landing__headline">
          <h1 className="landing__title">Employee Onboarding</h1>
          <p className="landing__subtitle">
            {view === "role-select" && "Choose how you'd like to join"}
            {view === "join" && "Enter your session code"}
            {view === "create" && "Create a new onboarding session"}
            {view === "recover" && "Restore your progress"}
          </p>
        </div>

        {/* Card */}
        <div className="landing__card">
          {/* ── role-select view ── */}
          {view === "role-select" && (
            <>
              <p className="landing__section-label">Join as</p>
              <div className="landing__stack">
                <button
                  type="button"
                  className="btn btn--primary landing__btn-full"
                  onClick={() => goToView("join")}
                >
                  New Employee
                </button>
                <button
                  type="button"
                  className="btn btn--secondary landing__btn-full"
                  onClick={() => goToView("create")}
                >
                  Admin
                </button>
              </div>
              <hr className="landing__rule" />
              <button
                type="button"
                className="btn btn--ghost landing__btn-muted"
                onClick={() => goToView("recover")}
              >
                Recover my progress
              </button>

              {/* Demo shortcuts */}
              <div className="landing__divider">
                <div className="landing__divider-line" />
                <span className="landing__divider-label">demo</span>
                <div className="landing__divider-line" />
              </div>
              <div className="landing__demo-row">
                <button
                  type="button"
                  className="btn btn--ghost landing__btn-demo"
                  onClick={handleDemoPlayer}
                >
                  As Employee
                </button>
                <button
                  type="button"
                  className="btn btn--ghost landing__btn-demo"
                  onClick={handleDemoAdmin}
                >
                  As Admin
                </button>
              </div>
            </>
          )}

          {/* ── join view ── */}
          {view === "join" && (
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
                  onChange={(e) => setSessionCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleJoin();
                  }}
                  autoFocus
                />
              </div>
              {errorMessage && (
                <p className="form-error" role="alert">{errorMessage}</p>
              )}
              <div className="landing__actions">
                <button
                  type="button"
                  className="btn btn--primary landing__btn-full"
                  disabled={!sessionCode.trim() || status === "loading"}
                  onClick={() => void handleJoin()}
                >
                  {status === "loading" ? "Joining…" : "Join session"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost landing__btn-full"
                  onClick={() => goToView("role-select")}
                >
                  Back
                </button>
              </div>
            </>
          )}

          {/* ── create view ── */}
          {view === "create" && (
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
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate();
                  }}
                  autoFocus
                />
              </div>
              {errorMessage && (
                <p className="form-error" role="alert">{errorMessage}</p>
              )}
              <div className="landing__actions">
                <button
                  type="button"
                  className="btn btn--primary landing__btn-full"
                  disabled={!sessionName.trim() || status === "loading"}
                  onClick={() => void handleCreate()}
                >
                  {status === "loading" ? "Creating…" : "Create session"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost landing__btn-full"
                  onClick={() => goToView("role-select")}
                >
                  Back
                </button>
              </div>

              {/* Template import */}
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
                onChange={(e) => void handleTemplateImport(e)}
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
                onClick={() => goToView("templates")}
              >
                Browse Templates
              </button>
            </>
          )}

          {/* ── templates view ── */}
          {view === "templates" && (
            <>
              <p className="landing__section-label landing__section-label--emphasis">
                Select a template to create a new session
              </p>
              {errorMessage && (
                <p className="form-error" role="alert">{errorMessage}</p>
              )}
              {templates.length === 0 &&
                !errorMessage &&
                status !== "loading" && (
                <p className="landing__hint">
                  No templates saved yet. Create a session and save it as a
                  template to see it here.
                </p>
              )}
              <div className="landing__template-list">
                {templates.map((t) => (
                  <div key={t.name} className="card landing__template-row">
                    <div>
                      <div className="landing__template-name">{t.name}</div>
                      <div className="landing__template-meta">
                        {t.milestones.length} milestones · {t.missions.length}
                        {" "}
                        missions
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={status === "loading"}
                      onClick={() =>
                        void handleLoadTemplateFromStore(t.name)}
                    >
                      {status === "loading" ? "Loading…" : "Use Template"}
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--ghost landing__back-btn"
                onClick={() => goToView("create")}
              >
                Back
              </button>
            </>
          )}

          {/* ── recover view ── */}
          {view === "recover" && (
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
                  onChange={(e) => setRecoveryKey(e.target.value)}
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
                  onChange={(e) => setRecoverySessionId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleRecover();
                  }}
                />
              </div>
              {errorMessage && (
                <p className="form-error" role="alert">{errorMessage}</p>
              )}
              <div className="landing__actions">
                <button
                  type="button"
                  className="btn btn--primary landing__btn-full"
                  disabled={!recoveryKey.trim() ||
                    !recoverySessionId.trim() ||
                    status === "loading"}
                  onClick={() => void handleRecover()}
                >
                  {status === "loading" ? "Recovering…" : "Restore progress"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost landing__btn-full"
                  onClick={() => goToView("role-select")}
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
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

      {/* Name capture - shown after join, before the recovery key */}
      {pendingPlayer && (
        <NameCaptureModal
          onSubmit={(name) => void handleNameSubmit(name)}
          loading={status === "loading"}
        />
      )}

      {/* Recovery key modal - shown once after the name step (join) or create */}
      {pendingRecoveryKey && !pendingPlayer && (
        <RecoveryKeyModal
          recoveryKey={pendingRecoveryKey}
          onDismiss={handleRecoveryKeyDismiss}
        />
      )}
    </>
  );
};

export default LandingPage;
