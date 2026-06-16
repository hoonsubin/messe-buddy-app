// Phase 1 shell - logic wired in Phase 2+.
interface TopBarProps {
  readonly playerName: string;
  readonly avatarUrl?: string;
  readonly totalXP: number;
  readonly role: string;
}

const TopBar = (props: TopBarProps) => (
  <header className="topbar" data-testid="topbar">
    <div className="topbar__avatar" aria-hidden="true">
      {props.avatarUrl && (
        <img src={props.avatarUrl} alt="" width="32" height="32" />
      )}
    </div>
    <span className="topbar__name">{props.playerName}</span>
    <span className="topbar__xp" aria-label={`${props.totalXP} XP`}>
      {props.totalXP} XP
    </span>
    <span className="visually-hidden">{props.role}</span>
  </header>
);

export default TopBar;
