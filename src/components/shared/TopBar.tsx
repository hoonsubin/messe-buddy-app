import { MdLogout, MdPerson } from "react-icons/md";

interface TopBarProps {
  readonly playerName: string;
  readonly avatarUrl?: string;
  /** Omit to hide the XP figure (e.g. the Game Maker view). */
  readonly totalXP?: number;
  readonly role: string;
  readonly onLogout?: () => void;
  readonly onAvatarClick?: () => void;
}

// First letters of the first and last name parts (max 2), uppercased.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}

const TopBar = (props: TopBarProps) => {
  const initialsText = initials(props.playerName);
  return (
    <header className="topbar" data-testid="topbar">
      <button
        type="button"
        className="topbar__avatar"
        aria-label="Edit profile"
        onClick={props.onAvatarClick}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: props.onAvatarClick ? "pointer" : "default",
          minWidth: "var(--min-touch)",
          minHeight: "var(--min-touch)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: "50%",
        }}
      >
        {props.avatarUrl
          ? <img src={props.avatarUrl} alt="" width="32" height="32" />
          : initialsText
          ? <span className="topbar__avatar-initials">{initialsText}</span>
          : <MdPerson size={18} />}
      </button>
      <span className="topbar__name">{props.playerName || "New hire"}</span>
      {props.totalXP !== undefined && (
        <span className="topbar__xp" aria-label={`${props.totalXP} XP`}>
          {props.totalXP} XP
        </span>
      )}
      <span className="visually-hidden">{props.role}</span>
      {props.onLogout && (
        <button
          type="button"
          onClick={props.onLogout}
          aria-label="Log out"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "hsl(var(--color-primary-fg) / 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-1)",
            borderRadius: "var(--radius)",
            flexShrink: 0,
            minWidth: "var(--min-touch)",
            minHeight: "var(--min-touch)",
          }}
        >
          <MdLogout size={18} aria-hidden="true" />
        </button>
      )}
    </header>
  );
};

export default TopBar;
