import { MdPerson } from "react-icons/md";

interface TopBarProps {
  readonly playerName: string;
  readonly avatarUrl?: string;
  /** Omit to hide the XP figure (e.g. the Game Maker view). */
  readonly totalXP?: number;
  readonly role: string;
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
      <div className="topbar__avatar" aria-hidden="true">
        {props.avatarUrl
          ? <img src={props.avatarUrl} alt="" width="32" height="32" />
          : initialsText
          ? <span className="topbar__avatar-initials">{initialsText}</span>
          : <MdPerson size={18} />}
      </div>
      <span className="topbar__name">{props.playerName || "New hire"}</span>
      {props.totalXP !== undefined && (
        <span className="topbar__xp" aria-label={`${props.totalXP} XP`}>
          {props.totalXP} XP
        </span>
      )}
      <span className="visually-hidden">{props.role}</span>
    </header>
  );
};

export default TopBar;
