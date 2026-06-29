interface XpBadgeProps {
  readonly value: number;
}

const XpBadge = (props: XpBadgeProps) => (
  <span
    className="xp-badge"
    data-testid="xp-badge"
    aria-label={`${props.value} XP`}
  >
    +{props.value}
    <span aria-hidden="true">XP</span>
  </span>
);

export default XpBadge;
