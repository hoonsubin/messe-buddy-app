import type { UserRole } from "../types.ts";

interface TopBarProps {
  title: string;
  role?: UserRole;
  totalXP?: number;
  onBack?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "green";
  };
}

export default function TopBar(
  { title, totalXP, onBack, action }: TopBarProps,
) {
  return (
    <div className="topbar">
      {onBack && (
        <button
          type="button"
          className="topbar-back"
          onClick={onBack}
          aria-label="Back"
        >
          ‹
        </button>
      )}
      <span className="topbar-title">{title}</span>
      {totalXP !== undefined && <span className="topbar-xp">XP {totalXP}</span>}
      {action && (
        <button
          type="button"
          className={`topbar-action${
            action.variant === "green" ? " green" : ""
          }`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
