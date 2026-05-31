import { useState } from "react";
import type { Navigate } from "../types.ts";
import {
  getMissionsForMilestone,
  MOCK_MILESTONES,
  MOCK_MISSIONS,
  MOCK_PLAYERS,
} from "../mockData.ts";
import TopBar from "../components/TopBar.tsx";
import MilestoneMapViewer from "../components/MilestoneMapViewer.tsx";
import TagBadge from "../components/TagBadge.tsx";

interface AdminCockpitPageProps {
  sessionId: string;
  navigate: Navigate;
}

export default function AdminCockpitPage(
  { sessionId, navigate }: AdminCockpitPageProps,
) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(MOCK_PLAYERS[0].id);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(
    MOCK_MILESTONES[4].id,
  ); // Hall A4
  const player = MOCK_PLAYERS.find((p) => p.id === selectedPlayerId)!;

  const selectedMilestone = MOCK_MILESTONES.find((m) =>
    m.id === selectedMilestoneId
  )!;
  const missionList = getMissionsForMilestone(selectedMilestoneId);
  const currentMissions = MOCK_MISSIONS.filter((m) => m.isInCurrentMissions);

  return (
    <div className="app-screen">
      <TopBar
        title={`Admin · ${sessionId}`}
        action={{
          label: "QR Scanner",
          onClick: () => navigate({ name: "qrScanner", sessionId }),
          variant: "green",
        }}
      />

      <div className="scroll">
        {/* Player selector */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="row sb">
            <span className="text-xs text-muted bold">VIEWING PLAYER</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate({ name: "playerList", sessionId })}
            >
              All Players →
            </button>
          </div>
          <select
            className="input mt4"
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
          >
            {MOCK_PLAYERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.jobTitle}</option>
            ))}
          </select>
        </div>

        {/* Player profile card */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--brand-deeper)",
            borderBottom: "1px solid rgba(0,0,0,0.2)",
          }}
        >
          <div className="row gap8">
            <div
              className="avatar lg"
              style={{ background: "var(--brand-bg)", color: "var(--brand)" }}
            >
              {player.name.split(" ").map((w) => w[0]).join("")}
            </div>
            <div className="flex1">
              <div
                style={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem" }}
              >
                {player.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#7AB8E8" }}>
                {player.jobTitle} · {player.team}
              </div>
              <div
                style={{ fontSize: "0.68rem", color: "#3A5A7A", marginTop: 2 }}
              >
                Start: {player.startDate} · {player.location}
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.2)",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#7AB8E8",
              }}
            >
              {player.totalXP} XP
            </div>
          </div>
        </div>

        {/* Milestone map editor */}
        <div className="sec-hdr">MILESTONE MAP EDITOR</div>
        <MilestoneMapViewer
          milestones={MOCK_MILESTONES}
          currentMilestoneId={selectedMilestoneId}
          draggable
          onMilestoneClick={(id) => setSelectedMilestoneId(id)}
        />
        <div className="drag-hint">
          Tap a room to edit its missions · In production: drag to reposition
        </div>

        <div style={{ padding: "6px 12px", display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm flex1">
            ⬆ Upload BG Image
          </button>
          <button type="button" className="btn btn-ghost btn-sm">
            Grid: ON
          </button>
        </div>

        {/* Milestone sidebar editor */}
        <div className="sec-hdr">
          MILESTONE SIDEBAR EDITOR
          <span>{selectedMilestone.name}</span>
        </div>
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {missionList.map((m) => (
            <div
              key={m.id}
              className="mission-card"
              style={{ cursor: "default" }}
            >
              <div className={`mission-accent ${m.type}`} />
              <div className="mission-body">
                <div className="mission-title">{m.title}</div>
                <div className="mission-meta">
                  <TagBadge label={m.type} variant={m.type} />
                  {m.tags.map((t) => (
                    <TagBadge
                      key={t}
                      label={t}
                      variant={t}
                    />
                  ))}
                  <span className="mission-xp">+{m.xpValue} XP</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{
                  margin: "8px",
                  fontSize: "0.72rem",
                  padding: "5px 10px",
                }}
              >
                Edit
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-full"
            style={{ fontSize: "0.85rem" }}
          >
            + Add Mission
          </button>
        </div>

        {/* Current missions list */}
        <div className="sec-hdr">CURRENT MISSIONS (drag to reorder)</div>
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {currentMissions.map((m) => (
            <div
              key={m.id}
              className="mission-card"
              style={{ cursor: "grab" }}
            >
              <div
                style={{
                  padding: "10px 8px",
                  color: "var(--text-subtle)",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ⠿
              </div>
              <div className={`mission-accent ${m.type}`} />
              <div className="mission-body">
                <div className="mission-title">{m.title}</div>
                <div className="mission-meta">
                  <TagBadge label={m.type} variant={m.type} />
                  <span className="mission-xp">+{m.xpValue} XP</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save / export */}
        <div
          style={{
            padding: "12px",
            display: "flex",
            gap: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            className="btn btn-primary flex1"
            onClick={() => alert("Changes saved! (prototype)")}
          >
            Save Changes
          </button>
          <button
            type="button"
            className="btn btn-ghost flex1"
            onClick={() => alert("Template exported! (prototype)")}
          >
            Export Template
          </button>
        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
