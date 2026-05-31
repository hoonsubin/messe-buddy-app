import { useState } from "react";
import type { Navigate } from "../types.ts";
import { MOCK_MISSIONS } from "../mockData.ts";
import TopBar from "../components/TopBar.tsx";

interface FormPageProps {
  missionId: string;
  sessionId: string;
  playerId: string;
  navigate: Navigate;
}

export default function FormPage(
  { missionId, sessionId, playerId, navigate }: FormPageProps,
) {
  const mission = MOCK_MISSIONS.find((m) => m.id === missionId)!;
  const [submitted, setSubmitted] = useState(false);

  // Prototype: mock form fields based on mission id
  const is90DayGoals = missionId === "msn-a4-3";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate({ name: "playerCockpit", sessionId, playerId });
    }, 1800);
  }

  if (submitted) {
    return (
      <div className="app-screen">
        <TopBar
          title="Form Submitted"
          onBack={() =>
            navigate({ name: "playerCockpit", sessionId, playerId })}
        />
        <div
          className="p16"
          style={{
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 16 }}>✓</div>
          <h2 style={{ color: "var(--success)", marginBottom: 8 }}>
            Submitted!
          </h2>
          <p>Your response has been saved. This mission is auto-approved.</p>
          <p className="text-xs text-muted mt8">Returning to cockpit…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen">
      <TopBar
        title={mission.title}
        onBack={() => navigate({ name: "playerCockpit", sessionId, playerId })}
      />

      <div className="scroll">
        <div style={{ padding: "12px 16px 4px" }}>
          <p className="text-sm text-muted">{mission.body}</p>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "12px 16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {is90DayGoals
            ? (
              <>
                <div className="col">
                  <label className="text-xs text-muted bold">
                    30-day goal *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="What do you want to achieve in the first 30 days?"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">
                    60-day goal *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Where do you want to be at 60 days?"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">
                    90-day goal *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="What does success look like at 90 days?"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">
                    Support needed
                  </label>
                  <input
                    className="input"
                    placeholder="What do you need from your manager?"
                  />
                </div>
              </>
            )
            : (
              <>
                <div className="col">
                  <label className="text-xs text-muted bold">Full Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Alex Meyer"
                    defaultValue="Alex Meyer"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">Job Title *</label>
                  <input
                    className="input"
                    placeholder="e.g. Product Designer"
                    defaultValue="Product Designer"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">Team *</label>
                  <input
                    className="input"
                    placeholder="e.g. UX & Research"
                    defaultValue="UX & Research"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">
                    Start Date *
                  </label>
                  <input
                    className="input"
                    type="date"
                    defaultValue="2026-06-01"
                    required
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">Location</label>
                  <input
                    className="input"
                    placeholder="e.g. Munich, Germany"
                    defaultValue="Munich"
                  />
                </div>
                <div className="col">
                  <label className="text-xs text-muted bold">Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Anything else you'd like your team to know?"
                  />
                </div>
              </>
            )}

          <div className="text-xs text-muted" style={{ textAlign: "center" }}>
            Form missions are auto-approved on submit — no QR scan needed.
          </div>
          <button type="submit" className="btn btn-success btn-full btn-lg">
            Save &amp; Submit
          </button>
        </form>
      </div>
    </div>
  );
}
