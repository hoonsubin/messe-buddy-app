import type { Player, MilestoneProgress } from "../../types/index.ts";

interface PlayerProfileCardProps {
  readonly player: Player | null;
  readonly totalXP: number;
  readonly milestoneProgress: ReadonlyArray<MilestoneProgress>;
}

const PlayerProfileCard = (props: PlayerProfileCardProps) => {
  if (!props.player) return null;

  const overallPct = props.milestoneProgress.length > 0
    ? Math.round(
      props.milestoneProgress.reduce(
        (sum, mp) => sum + mp.percentComplete,
        0,
      ) / props.milestoneProgress.length * 100,
    )
    : 0;

  return (
    <div
      className="card"
      data-testid="player-profile-card"
      data-player-id={props.player.id}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--weight-semibold)",
              margin: 0,
            }}
          >
            {props.player.name || "(No name)"}
          </p>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
              margin: "var(--space-1) 0 0",
            }}
          >
            {props.player.role} · {props.player.team}
          </p>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
              margin: "var(--space-1) 0 0",
            }}
          >
            Start date: {props.player.startDate}
          </p>
        </div>
        <div
          style={{
            textAlign: "center",
            flexShrink: 0,
            minWidth: "4rem",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-bold)",
              color: "hsl(var(--color-accent))",
              lineHeight: 1,
            }}
          >
            {props.totalXP}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "hsl(var(--color-muted-fg))",
              marginTop: "var(--space-1)",
            }}
          >
            XP
          </div>
        </div>
      </div>

      {/* Milestone progress bar */}
      {props.milestoneProgress.length > 0 && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--space-1)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              Milestone progress
            </span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-semibold)",
                color: "hsl(var(--color-fg))",
              }}
            >
              {overallPct}%
            </span>
          </div>
          <div
            style={{
              height: "0.375rem",
              borderRadius: "var(--radius-full)",
              background: "hsl(var(--color-border))",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${overallPct}%`,
                borderRadius: "var(--radius-full)",
                background: "hsl(var(--color-accent))",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfileCard;
