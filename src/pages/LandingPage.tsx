import { MdAdd, MdCheck, MdClose, MdPersonAdd, MdVpnKey } from "react-icons/md";
import { DEMO_PROFILES, useLandingFlow } from "../hooks/useLandingFlow.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import Toast from "../components/shared/Toast.tsx";

// ── Colour tokens per role ────────────────────────────────────────────────────

const PLAYER_ACCENT = "hsl(212 72% 37%)";
const ADMIN_ACCENT = "hsl(160 73% 28%)";
const PLAYER_BG = "hsl(212 72% 93%)";
const ADMIN_BG = "hsl(160 73% 91%)";

const accentFor = (role: string) =>
  role === USER_ROLE.GAMEMAKER ? ADMIN_ACCENT : PLAYER_ACCENT;

const bgFor = (role: string) =>
  role === USER_ROLE.GAMEMAKER ? ADMIN_BG : PLAYER_BG;

const roleLabel = (role: string) =>
  role === USER_ROLE.GAMEMAKER ? "Admin" : "Employee";

const initials = (name?: string): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
};

const isDemoProfile = (uid: string) => DEMO_PROFILES.some((d) => d.uid === uid);

// ── Profile card ──────────────────────────────────────────────────────────────

interface ProfileCardProps {
  readonly identity: CachedIdentity;
  readonly isKeyOpen: boolean;
  readonly onResume: (identity: CachedIdentity) => void;
  readonly onRemove: (uid: string) => void;
  readonly onShowKey: (uid: string) => void;
  readonly onHideKey: () => void;
}

const ProfileCard = ({
  identity,
  isKeyOpen,
  onResume,
  onRemove,
  onShowKey,
  onHideKey,
}: ProfileCardProps) => {
  const demo = isDemoProfile(identity.uid);
  const accent = accentFor(identity.role);
  const bg = bgFor(identity.role);

  return (
    <div style={{ marginBottom: "var(--space-2)" }}>
      {/* Main card row */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Resume as ${identity.name ?? "unnamed"}`}
        onClick={() => onResume(identity)}
        onKeyDown={(e) => e.key === "Enter" && onResume(identity)}
        style={{
          background: "hsl(var(--color-card))",
          border: "1px solid hsl(var(--color-border))",
          borderLeft: `3px solid ${accent}`,
          borderRadius: isKeyOpen
            ? "var(--radius-lg) var(--radius-lg) 0 0"
            : "var(--radius-lg)",
          padding:
            "var(--space-3) var(--space-2) var(--space-3) var(--space-3)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          cursor: "pointer",
          position: "relative",
          outline: "none",
          overflow: "hidden",
          transition: "box-shadow 0.15s ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 2px ${accent}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Demo pill */}
        {demo && (
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontSize: "10px",
              fontWeight: "var(--weight-semibold)",
              padding: "2px 7px",
              background: accent,
              color: "#fff",
              borderRadius: "0 0 var(--radius-sm) 0",
              letterSpacing: "0.06em",
              lineHeight: 1.5,
            }}
          >
            DEMO
          </span>
        )}

        {/* Avatar */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: bg,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-semibold)",
            flexShrink: 0,
            marginTop: demo ? "12px" : 0,
          }}
        >
          {initials(identity.name)}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0, marginTop: demo ? "12px" : 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {identity.name ?? "Unnamed"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {roleLabel(identity.role)} · {identity.sessionId}
          </p>
        </div>

        {/* Icon buttons */}
        <div
          style={{
            display: "flex",
            gap: 0,
            flexShrink: 0,
            marginTop: demo ? "12px" : 0,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={isKeyOpen ? "Hide recovery key" : "Show recovery key"}
            className="btn btn--ghost"
            style={{
              padding: "var(--space-1)",
              minHeight: "var(--touch-target)",
              minWidth: "var(--touch-target)",
              color: isKeyOpen ? accent : "hsl(var(--color-muted-fg))",
            }}
            onClick={() => (isKeyOpen ? onHideKey() : onShowKey(identity.uid))}
          >
            <MdVpnKey size={18} />
          </button>
          {!demo && (
            <button
              type="button"
              aria-label="Remove profile"
              className="btn btn--ghost"
              style={{
                padding: "var(--space-1)",
                minHeight: "var(--touch-target)",
                minWidth: "var(--touch-target)",
              }}
              onClick={() => onRemove(identity.uid)}
            >
              <MdClose size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Recovery key reveal strip */}
      {isKeyOpen && (
        <div
          style={{
            background: "hsl(var(--color-muted))",
            border: "1px solid hsl(var(--color-border))",
            borderLeft: `3px solid ${accent}`,
            borderTop: "none",
            borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
            padding: "var(--space-2) var(--space-3)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Recovery key:{" "}
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
                letterSpacing: "0.06em",
              }}
            >
              {identity.recoveryKey}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

// ── Employee join form (2-step) ───────────────────────────────────────────────

interface EmployeeFormProps {
  readonly step: "code" | "name";
  readonly sessionCode: string;
  readonly playerName: string;
  readonly verifiedSessionId: string;
  readonly status: "idle" | "loading" | "error";
  readonly errorMessage: string;
  readonly onCodeChange: (v: string) => void;
  readonly onNameChange: (v: string) => void;
  readonly onVerify: () => void;
  readonly onJoin: () => void;
  readonly onClose: () => void;
}

const EmployeeForm = ({
  step,
  sessionCode,
  playerName,
  verifiedSessionId,
  status,
  errorMessage,
  onCodeChange,
  onNameChange,
  onVerify,
  onJoin,
  onClose,
}: EmployeeFormProps) => (
  <div
    style={{
      border: "1px solid hsl(var(--color-border))",
      borderLeft: `3px solid ${PLAYER_ACCENT}`,
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-4)",
      marginTop: "var(--space-2)",
      background: "hsl(var(--color-muted))",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "var(--space-3)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
          color: "hsl(var(--color-fg))",
        }}
      >
        {step === "code"
          ? "Step 1 of 2 — session code"
          : "Step 2 of 2 — your name"}
      </span>
      <button
        type="button"
        aria-label="Close"
        className="btn btn--ghost"
        style={{
          minWidth: "var(--touch-target)",
          minHeight: "var(--touch-target)",
          padding: "var(--space-1)",
        }}
        onClick={onClose}
      >
        <MdClose size={18} />
      </button>
    </div>

    {step === "code"
      ? (
        <>
          <div className="landing__form-field--compact">
            <label htmlFor="lp-session-code" className="form-label">
              Session code
            </label>
            <input
              id="lp-session-code"
              type="text"
              className="form-input"
              value={sessionCode}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onVerify()}
              placeholder="e.g. sess_mmt2026"
              autoFocus
            />
          </div>
          {status === "error" && <p className="form-error">{errorMessage}</p>}
          <button
            type="button"
            className="btn btn--primary landing__btn-full"
            disabled={status === "loading" || !sessionCode.trim()}
            onClick={onVerify}
          >
            {status === "loading" ? "Verifying…" : "Verify session"}
          </button>
        </>
      )
      : (
        <>
          <p
            style={{
              margin: "0 0 var(--space-3)",
              fontSize: "var(--text-xs)",
              color: ADMIN_ACCENT,
              fontWeight: "var(--weight-medium)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            <MdCheck size={14} />
            Session found · {verifiedSessionId}
          </p>
          <div className="landing__form-field--compact">
            <label htmlFor="lp-player-name" className="form-label">
              Your name
            </label>
            <input
              id="lp-player-name"
              type="text"
              className="form-input"
              value={playerName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onJoin()}
              placeholder="e.g. Sofia Chen"
              autoFocus
            />
          </div>
          {status === "error" && <p className="form-error">{errorMessage}</p>}
          <button
            type="button"
            className="btn btn--primary landing__btn-full"
            disabled={status === "loading" || !playerName.trim()}
            onClick={onJoin}
          >
            {status === "loading" ? "Joining…" : "Join & save profile"}
          </button>
        </>
      )}
  </div>
);

// ── Admin create form ─────────────────────────────────────────────────────────

interface AdminFormProps {
  readonly sessionName: string;
  readonly adminName: string;
  readonly status: "idle" | "loading" | "error";
  readonly errorMessage: string;
  readonly onSessionNameChange: (v: string) => void;
  readonly onAdminNameChange: (v: string) => void;
  readonly onCreate: () => void;
  readonly onClose: () => void;
}

const AdminForm = ({
  sessionName,
  adminName,
  status,
  errorMessage,
  onSessionNameChange,
  onAdminNameChange,
  onCreate,
  onClose,
}: AdminFormProps) => (
  <div
    style={{
      border: "1px solid hsl(var(--color-border))",
      borderLeft: `3px solid ${ADMIN_ACCENT}`,
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-4)",
      marginTop: "var(--space-2)",
      background: "hsl(var(--color-muted))",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "var(--space-3)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
          color: "hsl(var(--color-fg))",
        }}
      >
        Create admin session
      </span>
      <button
        type="button"
        aria-label="Close"
        className="btn btn--ghost"
        style={{
          minWidth: "var(--touch-target)",
          minHeight: "var(--touch-target)",
          padding: "var(--space-1)",
        }}
        onClick={onClose}
      >
        <MdClose size={18} />
      </button>
    </div>

    <div className="landing__form-field--compact">
      <label htmlFor="lp-session-name" className="form-label">
        Session name
      </label>
      <input
        id="lp-session-name"
        type="text"
        className="form-input"
        value={sessionName}
        onChange={(e) => onSessionNameChange(e.target.value)}
        placeholder="e.g. MMT Onboarding June 2026"
        autoFocus
      />
    </div>

    <div className="landing__form-field--compact">
      <label htmlFor="lp-admin-name" className="form-label">
        Your name
      </label>
      <input
        id="lp-admin-name"
        type="text"
        className="form-input"
        value={adminName}
        onChange={(e) => onAdminNameChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCreate()}
        placeholder="e.g. Peter Tubak"
      />
    </div>

    {status === "error" && <p className="form-error">{errorMessage}</p>}
    <button
      type="button"
      className="btn btn--primary landing__btn-full"
      style={{ background: ADMIN_ACCENT, borderColor: ADMIN_ACCENT }}
      disabled={status === "loading" || !sessionName.trim() ||
        !adminName.trim()}
      onClick={onCreate}
    >
      {status === "loading" ? "Creating…" : "Create & save profile"}
    </button>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const LandingPage = () => {
  const flow = useLandingFlow();

  return (
    <div
      className="landing landing--grid-bg"
      data-testid="landing-page"
      data-page="landing"
      style={{ justifyContent: "flex-start", paddingTop: "var(--space-8)" }}
    >
      {/* Brand */}
      <div className="landing__brand">
        <div className="landing__brand-mark" aria-hidden="true">MM</div>
        <div>
          <span className="landing__brand-name">MesseBuddy</span>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
              lineHeight: 1,
            }}
          >
            Messe München onboarding
          </p>
        </div>
      </div>

      {/* Card */}
      <div
        className="landing__card"
        style={{ maxWidth: "28rem" }}
      >
        {/* Section: profiles */}
        <p className="landing__section-label">Your profiles</p>

        {flow.profiles.length === 0 && (
          <p
            style={{
              textAlign: "center",
              padding: "var(--space-4) 0",
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
              margin: "0 0 var(--space-3)",
            }}
          >
            No saved profiles. Add one below.
          </p>
        )}

        {flow.profiles.map((identity) => (
          <ProfileCard
            key={identity.uid}
            identity={identity}
            isKeyOpen={flow.keyPopupUid === identity.uid}
            onResume={flow.handleResume}
            onRemove={flow.handleRemoveProfile}
            onShowKey={flow.handleShowKey}
            onHideKey={flow.handleHideKey}
          />
        ))}

        {/* Add new profile buttons */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: flow.profiles.length > 0 ? "var(--space-1)" : 0,
          }}
        >
          <button
            type="button"
            className="btn btn--secondary"
            style={{
              flex: 1,
              gap: "var(--space-1)",
              borderStyle: "dashed",
              ...(flow.activeForm === "employee" && {
                borderStyle: "solid",
                borderColor: PLAYER_ACCENT,
                color: PLAYER_ACCENT,
              }),
            }}
            onClick={() =>
              flow.setActiveForm(
                flow.activeForm === "employee" ? null : "employee",
              )}
          >
            <MdPersonAdd size={16} />
            Employee
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            style={{
              flex: 1,
              gap: "var(--space-1)",
              borderStyle: "dashed",
              ...(flow.activeForm === "admin" && {
                borderStyle: "solid",
                borderColor: ADMIN_ACCENT,
                color: ADMIN_ACCENT,
              }),
            }}
            onClick={() =>
              flow.setActiveForm(
                flow.activeForm === "admin" ? null : "admin",
              )}
          >
            <MdAdd size={16} />
            Admin
          </button>
        </div>

        {/* Inline forms */}
        {flow.activeForm === "employee" && (
          <EmployeeForm
            step={flow.employeeStep}
            sessionCode={flow.sessionCode}
            playerName={flow.playerName}
            verifiedSessionId={flow.verifiedSessionId}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onCodeChange={flow.setSessionCode}
            onNameChange={flow.setPlayerName}
            onVerify={() => void flow.handleVerifySession()}
            onJoin={() => void flow.handleJoinSession()}
            onClose={() => flow.setActiveForm(null)}
          />
        )}

        {flow.activeForm === "admin" && (
          <AdminForm
            sessionName={flow.sessionName}
            adminName={flow.adminName}
            status={flow.status}
            errorMessage={flow.errorMessage}
            onSessionNameChange={flow.setSessionName}
            onAdminNameChange={flow.setAdminName}
            onCreate={() => void flow.handleCreateAdmin()}
            onClose={() => flow.setActiveForm(null)}
          />
        )}

        {/* Divider */}
        <hr className="landing__rule" />

        {/* Recovery section */}
        <p
          className="landing__section-label"
          style={{ marginBottom: "var(--space-3)" }}
        >
          Recover a profile
        </p>

        <div
          className="landing__form-field--compact"
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: 1 }}>
            <label htmlFor="lp-recovery-key" className="form-label">
              Recovery key
            </label>
            <input
              id="lp-recovery-key"
              type="text"
              className="form-input landing__input-mono"
              value={flow.recoveryKeyInput}
              onChange={(e) => flow.setRecoveryKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void flow.handleRecover()}
              placeholder="e.g. HOON0042"
            />
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ gap: "var(--space-1)", flexShrink: 0 }}
            disabled={flow.status === "loading" ||
              !flow.recoveryKeyInput.trim()}
            onClick={() => void flow.handleRecover()}
          >
            <MdVpnKey size={16} />
            Recover
          </button>
        </div>

        {/* Recovery error — only shown when no inline form is active */}
        {flow.status === "error" && flow.activeForm === null && (
          <p className="form-error">{flow.errorMessage}</p>
        )}
      </div>

      {/* Footer */}
      <p className="landing__footer">
        Having trouble?{" "}
        <a href="mailto:it@messe-muenchen.de" className="landing__footer-link">
          Contact IT support
        </a>
      </p>

      <Toast message={flow.toast} />
    </div>
  );
};

export default LandingPage;
