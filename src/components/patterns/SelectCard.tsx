import { cn } from "../../utils/cn.ts";

interface SelectCardProps {
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly testId?: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly tertiary?: string;
}

const SelectCard = ({
  selected,
  onSelect,
  testId,
  title,
  subtitle,
  tertiary,
}: SelectCardProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    className={cn("select-card", selected && "select-card--selected")}
    data-testid={testId}
    onClick={onSelect}
  >
    <span className="select-card__title">{title}</span>
    {subtitle && <span className="select-card__subtitle">{subtitle}</span>}
    {tertiary && <span className="select-card__tertiary">{tertiary}</span>}
  </button>
);

export default SelectCard;
