// Phase 1 shell - logic wired in Phase 2+.
import { MdDescription } from "react-icons/md";

interface ResourceCardProps {
  readonly title: string;
  readonly description?: string;
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
    <div className="resource-card__icon" aria-hidden="true">
      <MdDescription size={20} />
    </div>
    <div className="resource-card__body">
      <span className="resource-card__title">{props.title}</span>
      {props.description !== undefined && (
        <span className="resource-card__desc">{props.description}</span>
      )}
    </div>
  </a>
);

export default ResourceCard;
