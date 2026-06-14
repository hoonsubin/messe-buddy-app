// Phase 1 shell — logic wired in Phase 2+.
interface ResourceCardProps {
  readonly title: string;
  readonly type: string;
  readonly url: string;
}

const ResourceCard = (props: ResourceCardProps) => (
  <a
    className="resource-card"
    href={props.url}
    target="_blank"
    rel="noopener noreferrer"
    data-testid="resource-card"
  >
    <div className="resource-card__icon" aria-hidden="true">📄</div>
    <span className="resource-card__title">{props.title}</span>
    <span className="resource-card__type">{props.type}</span>
  </a>
);

export default ResourceCard;
