// Phase 1 shell — landing screen with role selection.
// Auth logic wired in Phase 3. Recovery key sub-screen shown on "Recover my progress".

import { useState } from "react";

type LandingView = "roleSelect" | "recover";

// ── Sub-screens ───────────────────────────────────────────────────────────────

const RoleSelectView = (props: { onRecover: () => void; onAdmin: () => void }) => (
  <>
    <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "hsl(var(--color-muted-fg))", margin: "0 0 var(--space-4)" }}>
      Join as
    </p>

    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <button type="button" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
        New Employee
      </button>
      <button
        type="button"
        className="btn btn--secondary"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={props.onAdmin}
      >
        Admin
      </button>
    </div>

    <hr style={{ margin: "var(--space-5) 0", border: "none", borderTop: "1px solid hsl(var(--color-border))" }} />

    <button
      type="button"
      className="btn btn--ghost"
      style={{ width: "100%", justifyContent: "center", color: "hsl(var(--color-muted-fg))", fontSize: "var(--text-sm)" }}
      onClick={props.onRecover}
    >
      Recover my progress
    </button>
  </>
);

const RecoverView = (props: { onBack: () => void }) => (
  <>
    <button
      type="button"
      className="btn btn--ghost"
      style={{ padding: 0, marginBottom: "var(--space-4)", fontSize: "var(--text-sm)", color: "hsl(var(--color-muted-fg))" }}
      onClick={props.onBack}
    >
      ← Back
    </button>

    <p style={{ fontWeight: "var(--weight-medium)", margin: "0 0 var(--space-4)" }}>
      Recover my progress
    </p>

    <form
      data-testid="recovery-form"
      onSubmit={(e) => e.preventDefault()}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      <div className="form-field">
        <label className="form-label" htmlFor="recovery-key">Recovery key</label>
        <input
          id="recovery-key"
          className="form-input"
          type="text"
          placeholder="Enter your recovery key"
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>
      <button type="submit" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
        Continue
      </button>
    </form>
  </>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const LandingPage = () => {
  const [view, setView] = useState<LandingView>("roleSelect");

  return (
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
        /* Wireframe grid overlay */
        backgroundImage:
          "linear-gradient(hsl(var(--color-border) / 0.5) 1px, transparent 1px), " +
          "linear-gradient(90deg, hsl(var(--color-border) / 0.5) 1px, transparent 1px)",
        backgroundSize: "2rem 2rem",
        padding: "var(--space-6) var(--space-4)",
        gap: "var(--space-6)",
      }}
    >
      {/* Messe München logotype */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
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
        <span style={{ fontSize: "var(--text-base)", color: "hsl(var(--color-muted-fg))", fontWeight: "var(--weight-medium)" }}>
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
        <p style={{ color: "hsl(var(--color-muted-fg))", marginTop: "var(--space-2)", marginBottom: 0, fontSize: "var(--text-sm)" }}>
          Choose how you'd like to join
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
        {view === "roleSelect" ? (
          <RoleSelectView onRecover={() => setView("recover")} onAdmin={() => undefined} />
        ) : (
          <RecoverView onBack={() => setView("roleSelect")} />
        )}
      </div>

      {/* Footer */}
      <p style={{ fontSize: "var(--text-xs)", color: "hsl(var(--color-muted-fg))", margin: 0, textAlign: "center" }}>
        Having trouble?{" "}
        <a href="mailto:it@messe-muenchen.de" style={{ color: "hsl(var(--color-primary))" }}>
          Contact IT Support
        </a>
      </p>
    </div>
  );
};

export default LandingPage;
