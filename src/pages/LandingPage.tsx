// Phase 1 shell — static layout only. All interaction wired in Phase 2.
// Role selection / recovery sub-screen switching is a Phase 2 concern.

// ── Page ──────────────────────────────────────────────────────────────────────

const LandingPage = () => (
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

    {/* Role selection card */}
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: "22rem",
        padding: "var(--space-6)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "hsl(var(--color-muted-fg))", margin: "0 0 var(--space-4)" }}>
        Join as
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {/* Phase 2: onClick → joinSession use case → redirect to /session/:id */}
        <button type="button" className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
          New Employee
        </button>
        {/* Phase 2: onClick → createGameMakerSession use case → redirect to /admin/:id */}
        <button type="button" className="btn btn--secondary" style={{ width: "100%", justifyContent: "center" }}>
          Admin
        </button>
      </div>

      <hr style={{ margin: "var(--space-5) 0", border: "none", borderTop: "1px solid hsl(var(--color-border))" }} />

      {/* Phase 2: onClick → show recovery key input inline */}
      <button
        type="button"
        className="btn btn--ghost"
        style={{ width: "100%", justifyContent: "center", color: "hsl(var(--color-muted-fg))", fontSize: "var(--text-sm)" }}
      >
        Recover my progress
      </button>
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

export default LandingPage;
