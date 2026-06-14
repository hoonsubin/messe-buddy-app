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
import type { TemplateExport } from "../types/index.ts";
import RecoveryKeyModal from "../components/shared/RecoveryKeyModal.tsx";
import { USER_ROLE } from "../types/index.ts";

type View = "role-select" | "join" | "create" | "recover" | "templates";
type Status = "idle" | "loading" | "error";

// ── Page ──────────────────────────────────────────────────────────────────────

// Module-level guard to prevent double-navigation under React 18+ StrictMode.
// Unlike useRef (which is re-initialized on StrictMode unmount/remount), a
// module-level variable survives remount and prevents the second effect fire
// from calling navigate() — which would otherwise throw a SecurityError:
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

  // Set after a successful join/create — triggers the modal
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(
    null,
  );
  // Set alongside pendingRecoveryKey so we know where to redirect on dismiss
  const [pendingRedirect, setPendingRedirect] = useState<string>("/");

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
      // joinSession already writes to localStorage — do NOT call setIdentity here,
      // which would fire the returning-user useEffect and navigate before the modal renders.
      setPendingRedirect(`/session/${result.identity.sessionId}`);
      setPendingRecoveryKey(result.identity.recoveryKey);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Session not found. Check your session code and try again.",
      );
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
        className="landing"
        data-testid="landing-page"
        data-page="landing"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(var(--color-bg))",
          backgroundImage:
            "linear-gradient(hsl(var(--color-border) / 0.5) 1px, transparent 1px), " +
            "linear-gradient(90deg, hsl(var(--color-border) / 0.5) 1px, transparent 1px)",
          backgroundSize: "2rem 2rem",
          padding: "var(--space-6) var(--space-4)",
          gap: "var(--space-6)",
        }}
      >
        {/* Messe München logotype */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              background: "hsl(var(--color-primary))",
              color: "hsl(var(--color-primary-fg))",
              borderRadius: "var(--radius-sm)",
              fontWeight: "var(--weight-semibold)",
              fontSize: "var(--text-base)",
              letterSpacing: "-0.03em",
              flexShrink: 0,
            }}
          >
            MM
          </div>
          <span
            style={{
              fontSize: "var(--text-base)",
              color: "hsl(var(--color-muted-fg))",
              fontWeight: "var(--weight-medium)",
            }}
          >
            Messe München
          </span>
        </div>

        {/* Headline */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-3xl)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              margin: 0,
              lineHeight: "var(--leading-tight)",
            }}
          >
            Employee Onboarding
          </h1>
          <p
            style={{
              color: "hsl(var(--color-muted-fg))",
              marginTop: "var(--space-2)",
              marginBottom: 0,
              fontSize: "var(--text-sm)",
            }}
          >
            {view === "role-select" && "Choose how you'd like to join"}
            {view === "join" && "Enter your session code"}
            {view === "create" && "Create a new onboarding session"}
            {view === "recover" && "Restore your progress"}
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "22rem",
            padding: "var(--space-6)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* ── role-select view ── */}
          {view === "role-select" && (
            <>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  color: "hsl(var(--color-muted-fg))",
                  margin: "0 0 var(--space-4)",
                }}
              >
                Join as
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    resetError();
                    setView("join");
                  }}
                >
                  New Employee
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    resetError();
                    setView("create");
                  }}
                >
                  Admin
                </button>
              </div>
              <hr
                style={{
                  margin: "var(--space-5) 0",
                  border: "none",
                  borderTop: "1px solid hsl(var(--color-border))",
                }}
              />
              <button
                type="button"
                className="btn btn--ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  color: "hsl(var(--color-muted-fg))",
                  fontSize: "var(--text-sm)",
                }}
                onClick={() => {
                  resetError();
                  setView("recover");
                }}
              >
                Recover my progress
              </button>

              {/* Demo shortcuts */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-2)",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "hsl(var(--color-border))",
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                    whiteSpace: "nowrap",
                  }}
                >
                  demo
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "hsl(var(--color-border))",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                }}
              >
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                  }}
                  onClick={handleDemoPlayer}
                >
                  As Employee
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                  }}
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
              <label
                htmlFor="session-code"
                style={{
                  display: "block",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  color: "hsl(var(--color-fg))",
                  marginBottom: "var(--space-2)",
                }}
              >
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
                style={{ width: "100%", marginBottom: "var(--space-4)" }}
              />
              {errorMessage && (
                <p
                  role="alert"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-destructive))",
                    margin: "0 0 var(--space-3)",
                  }}
                >
                  {errorMessage}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={!sessionCode.trim() || status === "loading"}
                  onClick={() => void handleJoin()}
                >
                  {status === "loading" ? "Joining…" : "Join session"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ width: "100%", justifyContent: "center" }}
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
              <label
                htmlFor="session-name"
                style={{
                  display: "block",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  color: "hsl(var(--color-fg))",
                  marginBottom: "var(--space-2)",
                }}
              >
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
                style={{ width: "100%", marginBottom: "var(--space-4)" }}
              />
              {errorMessage && (
                <p
                  role="alert"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-destructive))",
                    margin: "0 0 var(--space-3)",
                  }}
                >
                  {errorMessage}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={!sessionName.trim() || status === "loading"}
                  onClick={() => void handleCreate()}
                >
                  {status === "loading" ? "Creating…" : "Create session"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => {
                    resetError();
                    setView("role-select");
                  }}
                >
                  Back
                </button>
              </div>

              {/* Template import */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-2)",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "hsl(var(--color-border))",
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-muted-fg))",
                    whiteSpace: "nowrap",
                  }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "hsl(var(--color-border))",
                  }}
                />
              </div>
              <input
                ref={templateFileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={(e) => void handleTemplateImport(e)}
              />
              <button
                type="button"
                className="btn btn--ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: "var(--text-sm)",
                  color: "hsl(var(--color-muted-fg))",
                }}
                disabled={status === "loading"}
                onClick={() => templateFileRef.current?.click()}
              >
                {status === "loading" ? "Importing…" : "Import from template"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: "var(--text-sm)",
                  color: "hsl(var(--color-muted-fg))",
                }}
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
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  color: "hsl(var(--color-fg))",
                  margin: "0 0 var(--space-3)",
                }}
              >
                Select a template to create a new session
              </p>
              {errorMessage && (
                <p
                  role="alert"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-destructive))",
                    margin: "0 0 var(--space-3)",
                  }}
                >
                  {errorMessage}
                </p>
              )}
              {templates.length === 0 &&
                !errorMessage &&
                status !== "loading" && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-muted-fg))",
                    margin: "0 0 var(--space-3)",
                  }}
                >
                  No templates saved yet. Create a session and save it as a
                  template to see it here.
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                {templates.map((t) => (
                  <div
                    key={t.name}
                    className="card"
                    style={{
                      padding: "var(--space-3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: "var(--weight-medium)",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        {t.name}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "hsl(var(--color-muted-fg))",
                        }}
                      >
                        {t.milestones.length} milestones ·{" "}
                        {t.missions.length} missions
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
                className="btn btn--ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: "var(--space-3)",
                }}
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
              <label
                htmlFor="recover-key"
                style={{
                  display: "block",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  color: "hsl(var(--color-fg))",
                  marginBottom: "var(--space-2)",
                }}
              >
                Recovery key
              </label>
              <input
                id="recover-key"
                type="text"
                className="form-input"
                placeholder="8-character key"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                autoCapitalize="characters"
                autoFocus
                style={{
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  marginBottom: "var(--space-3)",
                }}
              />
              <label
                htmlFor="recover-session"
                style={{
                  display: "block",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  color: "hsl(var(--color-fg))",
                  marginBottom: "var(--space-2)",
                }}
              >
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
                style={{ width: "100%", marginBottom: "var(--space-4)" }}
              />
              {errorMessage && (
                <p
                  role="alert"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "hsl(var(--color-destructive))",
                    margin: "0 0 var(--space-3)",
                  }}
                >
                  {errorMessage}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={!recoveryKey.trim() ||
                    !recoverySessionId.trim() ||
                    status === "loading"}
                  onClick={() => void handleRecover()}
                >
                  {status === "loading" ? "Recovering…" : "Restore progress"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ width: "100%", justifyContent: "center" }}
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
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "hsl(var(--color-muted-fg))",
            margin: 0,
            textAlign: "center",
          }}
        >
          Having trouble?{" "}
          <a
            href="mailto:it@messe-muenchen.de"
            style={{ color: "hsl(var(--color-primary))" }}
          >
            Contact IT Support
          </a>
        </p>
      </div>

      {/* Recovery key modal — shown once after join/create */}
      {pendingRecoveryKey && (
        <RecoveryKeyModal
          recoveryKey={pendingRecoveryKey}
          onDismiss={handleRecoveryKeyDismiss}
        />
      )}
    </>
  );
};

export default LandingPage;
