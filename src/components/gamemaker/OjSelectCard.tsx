import { cn } from "../../utils/cn.ts";

interface OjSelectCardProps {
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly testId?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly tertiary?: string;
}

const OjSelectCard = ({
  selected,
  onSelect,
  testId,
  title,
  subtitle,
  tertiary,
}: OjSelectCardProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    className={cn("oj-select-card", selected && "oj-select-card--selected")}
    data-testid={testId}
    onClick={onSelect}
  >
    <span className="oj-select-card__title">{title}</span>
    {subtitle && <span className="oj-select-card__subtitle">{subtitle}</span>}
    {tertiary && <span className="oj-select-card__tertiary">{tertiary}</span>}
  </button>
);

export default OjSelectCard;
