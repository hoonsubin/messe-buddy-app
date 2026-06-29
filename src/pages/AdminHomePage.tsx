import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdAdd, MdArrowBack, MdChevronRight } from "react-icons/md";
import { USER_ROLE } from "../types/index.ts";
import { useActiveProfile } from "../hooks/useActiveProfile.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useGmHires } from "../hooks/useProgress/gmHires.ts";
import type { GmHireRow } from "../hooks/useProgress/gmHires.ts";
import TopBar from "../components/shared/TopBar.tsx";
import NameCaptureModal from "../components/shared/NameCaptureModal.tsx";

const statusOf = (h: GmHireRow): { label: string; colorVar: string } => {
  if (!h.joined) {
    return { label: "Not joined yet", colorVar: "--color-muted-fg" };
  }
  if (h.isStalled) return { label: "Stalled", colorVar: "--color-destructive" };
  if (h.progressPercent < 20) {
    return { label: "Just started", colorVar: "--color-muted-fg" };
  }
  if (h.progressPercent >= 100) {
    return { label: "Complete", colorVar: "--color-status-complete" };
  }
  return { label: "On track", colorVar: "--color-status-complete" };
};

const HireCard = (
  { hire, onOpen }: { readonly hire: GmHireRow; readonly onOpen: () => void },
) => {
  const status = statusOf(hire);
  return (
    <li
      className="card"
      role="button"
      tabIndex={0}
      data-testid="gm-hire-card"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{
        padding: "var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            marginBottom: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontWeight: "var(--weight-semibold)",
              fontSize: "var(--text-base)",
              color: "hsl(var(--color-fg))",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hire.name}
          </span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)",
              color: `hsl(var(${status.colorVar}))`,
              flexShrink: 0,
            }}
          >
            {status.label}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <div
            role="progressbar"
            aria-valuenow={hire.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${hire.progressPercent}% complete`}
            style={{
              flex: 1,
              height: "0.5rem",
              borderRadius: "var(--radius-full)",
              background: "hsl(var(--color-xp-ring-track))",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${hire.progressPercent}%`,
                height: "100%",
                borderRadius: "var(--radius-full)",
                background: hire.isStalled
                  ? "hsl(var(--color-destructive))"
                  : "hsl(var(--color-status-progress))",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              minWidth: "2.5rem",
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {hire.progressPercent}%
          </span>
        </div>
      </div>
      <MdChevronRight
        size={22}
        aria-hidden="true"
        className="core-icon-muted"
      />
    </li>
  );
};

const AdminHomePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sid = sessionId ?? "";
  const navigate = useNavigate();
  const { removeProfile } = useIdentity();
  const identity = useActiveProfile(sid, USER_ROLE.GAMEMAKER);

  const { hires, loading, createHire } = useGmHires(identity?.uid, true);

  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(
    (name: string) => {
      setCreating(true);
      void createHire(name)
        .then((newSessionId) => {
          setAdding(false);
          setCreating(false);
          // New hire → land on Customize (the dashboard is empty until joined).
          navigate(`/admin/${sid}/hire/${newSessionId}?new=1`);
        })
        .catch(() => setCreating(false));
    },
    [createHire, navigate, sid],
  );

  // Only show hires who have actually joined (real players), not empty/pending
  // sessions.
  const visibleHires = hires.filter((h) => h.joined);
  const joinedCount = visibleHires.length;
  const avgProgress = joinedCount > 0
    ? Math.round(
      visibleHires.reduce((s, h) => s + h.progressPercent, 0) / joinedCount,
    )
    : 0;
  const stalledCount = visibleHires.filter((h) => h.isStalled).length;

  return (
    <div
      data-testid="admin-home-page"
      data-page="admin-home"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        paddingTop: "var(--topbar-h)",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <div
        style={{
          display: "flex",
          padding: "var(--space-2) var(--space-4)",
          background: "hsl(var(--color-card))",
          borderBottom: "1px solid hsl(var(--color-border))",
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
          onClick={() => {
            if (identity && !identity.isDemo) removeProfile(identity.uid);
            navigate("/", { replace: true });
          }}
        >
          <MdArrowBack size={16} />
          {identity?.isDemo ? "Back to Landing" : "Log Out"}
        </button>
      </div>

      <main
        style={{
          flex: 1,
          padding: "var(--space-6) var(--space-4)",
          maxWidth: "48rem",
          marginInline: "auto",
          width: "100%",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            marginBottom: "var(--space-5)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
              }}
            >
              New Hires
            </h1>
            <p
              style={{
                margin: "var(--space-1) 0 0",
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              {joinedCount} active · {avgProgress}% avg progress
              {stalledCount > 0 ? ` · ${stalledCount} stalled` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            data-testid="add-hire-btn"
            style={{ gap: "var(--space-1)", flexShrink: 0 }}
            onClick={() => setAdding(true)}
          >
            <MdAdd size={18} aria-hidden="true" />
            Add new hire
          </button>
        </header>

        {loading && visibleHires.length === 0
          ? (
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-muted-fg))",
                textAlign: "center",
                padding: "var(--space-8) 0",
              }}
            >
              Loading new hires…
            </p>
          )
          : visibleHires.length === 0
          ? (
            <div
              className="card"
              style={{
                padding: "var(--space-8) var(--space-6)",
                textAlign: "center",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              <p
                style={{
                  margin: "0 0 var(--space-4)",
                  fontSize: "var(--text-sm)",
                }}
              >
                No new hires yet. Add your first one to start their onboarding.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ gap: "var(--space-1)" }}
                onClick={() => setAdding(true)}
              >
                <MdAdd size={18} aria-hidden="true" />
                Add new hire
              </button>
            </div>
          )
          : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {visibleHires.map((hire) => (
                <HireCard
                  key={hire.sessionId}
                  hire={hire}
                  onOpen={() =>
                    navigate(`/admin/${sid}/hire/${hire.sessionId}`)}
                />
              ))}
            </ul>
          )}
      </main>

      {adding && (
        <NameCaptureModal
          onSubmit={handleCreate}
          loading={creating}
          title="Add a new hire"
          description="Give this onboarding a name (the new hire's name works well). You'll pick a template and send them an invite next."
          placeholder="e.g. Sofia Chen"
          submitLabel="Create"
          inputLabel="New hire name"
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
};

export default AdminHomePage;
