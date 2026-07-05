import { useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { USER_ROLE } from "../types/index.ts";
import { useIdentity } from "../hooks/useIdentity.ts";
import { useValidationConfirm } from "../hooks/useValidationConfirm.ts";
import FetchErrorPanel from "../components/shared/FetchErrorPanel.tsx";
import TopBar from "../components/shared/TopBar.tsx";

const ValidationPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sid = sessionId ?? "";
  const token = searchParams.get("t") ?? "";

  // This route's sessionId is the *player's* session, which never matches a
  // GM's cached identity (scoped to their own home session) — so instead of
  // useActiveProfile's exact-sessionId lookup, find any locally stored GM
  // identity whose uid owns this player (session.gameMakerId), once the player
  // session has loaded. `gameMakerId` is mirrored into state — adjusted
  // during render (React's documented pattern for deriving state from a
  // changed prop/value without an Effect) rather than in a useEffect — so the
  // single `useValidationConfirm` call below can be re-invoked with the
  // resolved validator uid without a second, duplicate session/decode fetch.
  const { profiles } = useIdentity();

  const validation = useValidationConfirm(sid, token, undefined);

  const identity = useMemo(() => {
    const gmId = validation.gameMakerId;
    if (!gmId) return null;
    return profiles.find(
      (p) => p.role === USER_ROLE.GAMEMAKER && p.uid === gmId,
    ) ?? null;
  }, [validation.gameMakerId, profiles]);

  // Session has loaded (we know who owns it) but no locally stored GM
  // identity matches — this GM is not authorized to validate this player.
  const unauthorized = !validation.loading && validation.gameMakerId !== null &&
    identity === null;

  // Always return the GM to their own home session, never the player's — the
  // two are different sessionIds, and /gamemaker/:sessionId's RequireRole guard
  // checks the GM's home session specifically. `identity` (resolved above via
  // gameMakerId) carries that home sessionId; if it hasn't resolved yet (or
  // this GM isn't authorized for this player), fall back to the public landing
  // page instead of a route that will just bounce.
  const goToGmHome = useCallback(() => {
    navigate(identity?.sessionId ? `/gamemaker/${identity.sessionId}` : "/", {
      replace: true,
    });
  }, [navigate, identity]);

  const handleConfirm = useCallback(async () => {
    try {
      await validation.confirm(identity?.uid);
      goToGmHome();
    } catch {
      // confirm error surfaced via validation.errorMessage
    }
  }, [goToGmHome, validation, identity?.uid]);

  if (validation.errorKind === "missing_token") {
    return (
      <FetchErrorPanel
        message={validation.errorMessage ??
          "Missing validation token."}
        onRetry={() => validation.retry()}
        retryLabel="Reload"
        onBack={goToGmHome}
        backLabel="Back to cockpit"
        testId="validation-page"
        page="validation"
      />
    );
  }

  if (
    validation.errorKind === "decode" && validation.errorMessage &&
    !validation.payload
  ) {
    return (
      <FetchErrorPanel
        message={validation.errorMessage}
        onRetry={() => validation.refresh()}
        onBack={goToGmHome}
        backLabel="Back to cockpit"
        testId="validation-page"
        page="validation"
      />
    );
  }

  if (unauthorized) {
    return (
      <FetchErrorPanel
        message="You're not signed in as this player's Game Master, so you can't confirm this validation. Sign in from that Game Master's own GM workspace and scan again."
        onRetry={() => navigate("/", { replace: true })}
        retryLabel="Go to home"
        testId="validation-page"
        page="validation"
      />
    );
  }

  const showSpinner = validation.loading;

  return (
    <div
      data-testid="validation-page"
      data-page="validation"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "hsl(var(--color-bg))",
      }}
    >
      <TopBar
        playerName={identity?.name ?? identity?.uid ?? "Game Master"}
        totalXP={0}
        role="Game Master"
      />

      <main
        style={{
          flex: 1,
          padding:
            "calc(var(--topbar-h) + var(--space-6)) var(--space-4) var(--space-8)",
          maxWidth: "28rem",
          marginInline: "auto",
          width: "100%",
        }}
      >
        <h1
          style={{
            margin: "0 0 var(--space-6)",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          Confirm validation
        </h1>

        {showSpinner && (
          <p style={{ color: "hsl(var(--color-muted-fg))" }}>
            Verifying QR code…
          </p>
        )}

        {!showSpinner && validation.errorKind === "wrong_session" && (
          <FetchErrorPanel
            message={validation.errorMessage ??
              "This QR code belongs to a different session."}
            onRetry={() => validation.retry()}
            retryLabel="Try again"
            onBack={goToGmHome}
            backLabel="Back to cockpit"
          />
        )}

        {!showSpinner && validation.errorKind === "decode" &&
          validation.errorMessage && (
          <FetchErrorPanel
            message={validation.errorMessage}
            onRetry={() => validation.retry()}
            retryLabel="Try again"
            onBack={goToGmHome}
            backLabel="Back to cockpit"
          />
        )}

        {!showSpinner && !validation.errorKind && validation.payload && (
          <div
            className="card"
            style={{
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {validation.alreadyCompleted
              ? (
                <p
                  role="status"
                  style={{
                    margin: 0,
                    color: "hsl(var(--color-status-complete))",
                    fontWeight: "var(--weight-medium)",
                  }}
                >
                  This mission is already completed.
                </p>
              )
              : (
                <p
                  style={{
                    margin: 0,
                    color: "hsl(var(--color-muted-fg))",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Review the details below, then confirm to award XP.
                </p>
              )}

            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: "var(--space-3)",
                fontSize: "var(--text-sm)",
              }}
            >
              {validation.milestoneName && (
                <>
                  <dt style={{ color: "hsl(var(--color-muted-fg))" }}>
                    Milestone
                  </dt>
                  <dd
                    style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}
                  >
                    {validation.milestoneName}
                  </dd>
                </>
              )}
              <dt style={{ color: "hsl(var(--color-muted-fg))" }}>Mission</dt>
              <dd style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
                {validation.missionTitle}
              </dd>
              <dt style={{ color: "hsl(var(--color-muted-fg))" }}>Player</dt>
              <dd style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
                {validation.playerName}
              </dd>
              <dt style={{ color: "hsl(var(--color-muted-fg))" }}>XP</dt>
              <dd style={{ margin: 0, fontWeight: "var(--weight-semibold)" }}>
                +{validation.xpValue}
              </dd>
            </dl>

            {validation.errorKind === "confirm" && validation.errorMessage && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "hsl(var(--color-destructive))",
                  fontSize: "var(--text-sm)",
                }}
              >
                {validation.errorMessage}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                marginTop: "var(--space-2)",
              }}
            >
              {!validation.alreadyCompleted && (
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  disabled={validation.confirming}
                  data-testid="validation-confirm-btn"
                  onClick={() => void handleConfirm()}
                >
                  {validation.confirming ? "Saving…" : "Confirm"}
                </button>
              )}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={goToGmHome}
                disabled={validation.confirming}
              >
                {validation.alreadyCompleted ? "Back to cockpit" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ValidationPage;
