import { MdLogout, MdPerson } from "react-icons/md";
import Avatar from "./Avatar.tsx";
import IconButton from "./IconButton.tsx";
import { ICON_BUTTON_VARIANT } from "./types.ts";

interface TopBarProps {
  readonly playerName: string;
  readonly avatarUrl?: string;
  /** Omit to hide the XP figure (e.g. the Game Maker view). */
  readonly totalXP?: number;
  readonly role: string;
  readonly onLogout?: () => void;
  readonly onAvatarClick?: () => void;
}

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
      {props.onAvatarClick && (
        <Avatar
          src={props.avatarUrl}
          initials={initialsText || undefined}
          fallback={<MdPerson size={18} aria-hidden="true" />}
          aria-label="Edit profile"
          onClick={props.onAvatarClick}
        />
      )}
      <span className="topbar__name">{props.playerName || "Player"}</span>
      {props.totalXP !== undefined && (
        <span className="topbar__xp" aria-label={`${props.totalXP} XP`}>
          {props.totalXP} XP
        </span>
      )}
      <span className="visually-hidden">{props.role}</span>
      {props.onLogout && (
        <IconButton
          variant={ICON_BUTTON_VARIANT.ON_PRIMARY}
          onClick={props.onLogout}
          aria-label="Log out"
        >
          <MdLogout size={18} aria-hidden="true" />
        </IconButton>
      )}
    </header>
  );
};

export default TopBar;
