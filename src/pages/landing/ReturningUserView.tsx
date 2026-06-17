import { MdArrowForward, MdLogout, MdPersonAdd } from "react-icons/md";
import type { LandingView } from "../../hooks/useLandingFlow.ts";
import type { LocalIdentity } from "../../types/index.ts";
import { USER_ROLE } from "../../types/index.ts";

interface ReturningUserViewProps {
  readonly identity: LocalIdentity;
  readonly onResume: () => void;
  readonly onLogout: () => void;
  readonly onGoToView: (view: LandingView) => void;
}

const ReturningUserView = ({
  identity,
  onResume,
  onLogout,
  onGoToView,
}: ReturningUserViewProps) => {
  const roleLabel = identity.role === USER_ROLE.PLAYER ? "Employee" : "Admin";

  return (
    <>
      {/* Session summary chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-4)",
          background: "hsl(var(--color-accent) / 0.08)",
          border: "1px solid hsl(var(--color-accent) / 0.25)",
          borderRadius: "var(--radius)",
          marginBottom: "var(--space-2)",
        }}
      >
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "50%",
            background: "hsl(var(--color-accent))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-bold)",
            color: "hsl(var(--color-accent-fg))",
            flexShrink: 0,
          }}
        >
          {roleLabel[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
              }}
            >
              {identity.name ?? roleLabel}
            </p>
            {identity.isDemo && (
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--weight-semibold)",
                  color: "hsl(var(--color-accent))",
                  background: "hsl(var(--color-accent) / 0.12)",
                  border: "1px solid hsl(var(--color-accent) / 0.3)",
                  borderRadius: "9999px",
                  padding: "0 var(--space-2)",
                  lineHeight: "1.5",
                }}
              >
                Demo
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
              fontFamily: "monospace",
            }}
          >
            {roleLabel} · {identity.sessionId}
          </p>
        </div>
      </div>

      <div className="landing__stack">
        <button
          type="button"
          className="btn btn--primary landing__btn-full"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            justifyContent: "center",
          }}
          onClick={onResume}
        >
          Continue Session
          <MdArrowForward size={18} />
        </button>
      </div>

      <hr className="landing__rule" />

      <div className="landing__stack" style={{ gap: "var(--space-2)" }}>
        <button
          type="button"
          className="btn btn--ghost landing__btn-full"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            justifyContent: "center",
            color: "hsl(var(--color-muted-fg))",
            fontSize: "var(--text-sm)",
          }}
          onClick={() => {
            onLogout();
            onGoToView("join");
          }}
        >
          <MdPersonAdd size={16} />
          Join a different session
        </button>

        <button
          type="button"
          className="btn btn--ghost landing__btn-full"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            justifyContent: "center",
            color: "hsl(var(--color-destructive, 0 84% 60%) / 0.8)",
            fontSize: "var(--text-sm)",
          }}
          onClick={onLogout}
        >
          <MdLogout size={16} />
          Log out
        </button>
      </div>
    </>
  );
};

export default ReturningUserView;
