// Phase 1 shell — pre-boarding checklist card for the admin cockpit.
// Visually and structurally distinct from the mission editor. Logic wired in Phase 3+.
import { MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md";

interface PreBoardingChecklistItem {
  readonly label: string;
  readonly checked: boolean;
}

interface PreBoardingChecklistProps {
  readonly playerName?: string;
  readonly items?: ReadonlyArray<PreBoardingChecklistItem>;
}

const DEFAULT_ITEMS: ReadonlyArray<PreBoardingChecklistItem> = [
  { label: "Workspace prepared (desk, badge, parking)", checked: true },
  { label: "Laptop ordered and configured", checked: true },
  { label: "System access requested (email, Slack, HR tools)", checked: false },
  { label: "Team intro scheduled (buddy + manager)", checked: false },
  { label: "Welcome kit assembled", checked: false },
];

const PreBoardingChecklist = (props: PreBoardingChecklistProps) => {
  const playerName = props.playerName ?? "Anna";
  const items = props.items ?? DEFAULT_ITEMS;
  const completedCount = items.filter((i) => i.checked).length;

  return (
    <section
      aria-label="Pre-boarding checklist"
      data-testid="pre-boarding-checklist"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <header>
          <h2
            style={{
              margin: "0 0 var(--space-1)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Before {playerName}'s first day
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            {completedCount} of {items.length} tasks complete
          </p>
        </header>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: item.checked
                  ? "hsl(var(--color-status-complete) / 0.08)"
                  : "hsl(var(--color-bg))",
                minHeight: "var(--min-touch)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  fontSize: "var(--text-xl)",
                  color: item.checked
                    ? "hsl(var(--color-status-complete))"
                    : "hsl(var(--color-muted-fg))",
                }}
              >
                {item.checked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
              </span>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: item.checked
                    ? "hsl(var(--color-status-complete))"
                    : "hsl(var(--color-fg))",
                  fontWeight: "var(--weight-medium)",
                  textDecoration: item.checked ? "line-through" : "none",
                }}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export type { PreBoardingChecklistItem };
export default PreBoardingChecklist;
