// Phase 1 shell — logic wired in Phase 2+.
interface XPBadgeProps {
  readonly value: number;
}

const XPBadge = (props: XPBadgeProps) => (
  <span className="xp-badge" data-testid="xp-badge" aria-label={`${props.value} XP`}>
    +{props.value}
    <span aria-hidden="true"> XP</span>
  </span>
);

export default XPBadge;
