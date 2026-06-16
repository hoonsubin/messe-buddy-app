import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import {
  createGameMakerSession,
  joinSession,
} from "../use-cases/joinSession.ts";
import { recoverIdentity } from "../use-cases/recoverIdentity.ts";
import { importTemplate } from "../use-cases/importTemplate.ts";
import type { Player, TemplateExport } from "../types/index.ts";
import RecoveryKeyModal from "../components/shared/RecoveryKeyModal.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";
import { USER_ROLE } from "../types/index.ts";

type View = "role-select" | "join" | "create" | "recover" | "templates";
type Status = "idle" | "loading" | "error";

// ── Page ──────────────────────────────────────────────────────────────────────

// Module-level guard to prevent double-navigation under React 18+ StrictMode.
// Unlike useRef (which is re-initialized on StrictMode unmount/remount), a
// module-level variable survives remount and prevents the second effect fire
// from calling navigate() - which would otherwise throw a SecurityError:
// "Too many calls to Location or History APIs within a short timeframe."
let hasNavigated = false;

const LandingPage = () => {
  const navigate = useNavigate();
  const adapter = useAdapter();
  const { identity, setIdentity } = useIdentity();

  const [view, setView] = useState<View>("role-select");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Controlled inputs
  const [sessionCode, setSessionCode] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoverySessionId, setRecoverySessionId] = useState("");
  const [templates, setTemplates] = useState<ReadonlyArray<TemplateExport>>([]);

  // Set after a successful join/create - triggers the modal
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(
    null,
  );
  // Set alongside pendingRecoveryKey so we know where to redirect on dismiss
  const [pendingRedirect, setPendingRedirect] = useState<string>("/");
  // Player awaiting a name — gates the name-capture step before the recovery key
  const [pendingPlayer, setPendingPlayer] = useState<Player | null>(null);

  // Hidden file input for template import
  const templateFileRef = useRef<HTMLInputElement>(null);

  // Returning user: if identity exists in localStorage, navigate to cockpit
  // only if the user hasn't explicitly chosen a view (i.e. landing page loads
  // and identity is present, but the user hasn't clicked any button yet).
  // Uses module-level hasNavigated (not useRef) to survive StrictMode remount.
  useEffect(() => {
    if (!identity || view !== "role-select") return;
    if (hasNavigated) return;
    hasNavigated = true;
    const dest = identity.role === USER_ROLE.PLAYER
      ? `/session/${identity.sessionId}`
      : `/admin/${identity.sessionId}`;
    try {
      navigate(dest, { replace: true });
    } catch {
      // Suppress SecurityError from react-router when navigate() is called
      // too rapidly (StrictMode double-fire safety net).
    }
  }, [identity, navigate, view]);

  // Fetch templates when entering templates view
  useEffect(() => {
    if (view !== "templates") return;
    void adapter.listTemplates().then(setTemplates);
  }, [adapter, view]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleJoin = async () => {
    if (!sessionCode.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await joinSession(sessionCode.trim(), adapter);
      // joinSession already writes to localStorage - do NOT call setIdentity here,
      // which would fire the returning-user useEffect and navigate before the modal renders.
      setPendingRedirect(`/session/${result.identity.sessionId}`);
      // Capture the player's name before revealing the recovery key.
      setPendingPlayer(result.player);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Session not found. Check your session code and try again.",
      );
    }
  };

  // Persist the name entered in the capture step, then reveal the recovery key.
  const handleNameSubmit = async (name: string) => {
    if (!pendingPlayer) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      await adapter.updatePlayer(pendingPlayer.id, { name });
      setPendingRecoveryKey(pendingPlayer.recoveryKey);
      setPendingPlayer(null);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not save your name. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!sessionName.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const createdIdentity = await createGameMakerSession(
        sessionName.trim(),
        adapter,
      );
      // Same reasoning: use case writes localStorage; setIdentity would race the modal.
      setPendingRedirect(`/admin/${createdIdentity.sessionId}`);
      setPendingRecoveryKey(createdIdentity.recoveryKey);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not create session. Please try again.");
    }
  };

  const handleRecover = async () => {
    if (!recoveryKey.trim() || !recoverySessionId.trim()) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const recovered = await recoverIdentity(
        recoveryKey.trim().toUpperCase(),
        recoverySessionId.trim(),
        adapter,
      );
      // recoverIdentity writes localStorage; navigate directly (no modal for recovery).
      const dest = recovered.role === USER_ROLE.PLAYER
        ? `/session/${recovered.sessionId}`
        : `/admin/${recovered.sessionId}`;
      navigate(dest, { replace: true });
    } catch {
      setStatus("error");
      setErrorMessage(
        "No account found for that key and session. Check and try again.",
      );
    }
  };

  // ── demo shortcuts ────────────────────────────────────────────────────────

  const handleDemoPlayer = () => {
    setIdentity({
      uid: "uid_sofia_002",
      recoveryKey: "SOFIA026",
      sessionId: "sess_mmt2026",
      role: USER_ROLE.PLAYER,
    });
    // useEffect above navigates to /session/sess_mmt2026
  };

  const handleDemoAdmin = () => {
    setIdentity({
      uid: "uid_gamemaker_peter",
      recoveryKey: "DEMO1234",
      sessionId: "sess_mmt2026",
      role: USER_ROLE.GAMEMAKER,
    });
    // useEffect above navigates to /admin/sess_mmt2026
  };

  const handleLoadTemplateFromStore = async (templateName: string) => {
    const template = templates.find((t) => t.name === templateName);
    if (!template) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const gmUid = crypto.randomUUID();
      const newSessionId = await importTemplate(
        template,
        template.name,
        gmUid,
        adapter,
      );
      setIdentity({
        uid: gmUid,
        recoveryKey: "TMPL0001",
        sessionId: newSessionId,
        role: USER_ROLE.GAMEMAKER,
      });
    } catch {
      setStatus("error");
      setErrorMessage("Could not import template. Please try again.");
    }
  };

  const handleTemplateImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const text = await file.text();
      const template = JSON.parse(text) as TemplateExport;
      const gmUid = crypto.randomUUID();
      const newSessionId = await importTemplate(
        template,
        template.name,
        gmUid,
        adapter,
      );
      setIdentity({
        uid: gmUid,
        recoveryKey: "IMPRT001",
        sessionId: newSessionId,
        role: USER_ROLE.GAMEMAKER,
      });
      // useEffect navigates to /admin/:newSessionId
    } catch {
      setStatus("error");
      setErrorMessage(
        "Could not import template. Make sure it's a valid MesseBuddy template file.",
      );
    }
  };

  const handleRecoveryKeyDismiss = () => {
    navigate(pendingRedirect, { replace: true });
  };

  const resetError = () => {
    setErrorMessage("");
    setStatus("idle");
  };

  // ── shared shell ────────────────────────────────────────────────────────────

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
                  onClick={() => {
                    resetError();
                    setView("join");
                  }}
                >
                  New Employee
                </button>
                <button
                  type="button"
                  className="btn btn--secondary landing__btn-full"
                  onClick={() => {
                    resetError();
                    setView("create");
                  }}
                >
                  Admin
                </button>
              </div>
              <hr className="landing__rule" />
              <button
                type="button"
                className="btn btn--ghost landing__btn-muted"
                onClick={() => {
                  resetError();
                  setView("recover");
                }}
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
                  onClick={() => {
                    resetError();
                    setView("role-select");
                  }}
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
                  onClick={() => {
                    resetError();
                    setView("role-select");
                  }}
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
                onClick={() => {
                  resetError();
                  setView("templates");
                }}
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
                onClick={() => {
                  resetError();
                  setView("create");
                }}
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
                  onClick={() => {
                    resetError();
                    setView("role-select");
                  }}
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
