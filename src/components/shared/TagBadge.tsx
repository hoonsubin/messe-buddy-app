// Phase 1 shell - logic wired in Phase 2+.
interface TagBadgeProps {
  readonly label: string;
  readonly variant?: string;
}

const TagBadge = (props: TagBadgeProps) => (
  <span
    className={`tag-badge${
      props.variant ? ` tag-badge--${props.variant}` : ""
    }`}
    data-testid="tag-badge"
  >
    {props.label}
  </span>
);

export default TagBadge;
