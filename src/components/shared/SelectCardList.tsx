import { cn } from "../../utils/cn.ts";
import SelectCard from "./SelectCard.tsx";

export interface SelectCardListItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly tertiary?: string;
  readonly testId?: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

interface SelectCardListProps {
  readonly ariaLabel: string;
  readonly items: ReadonlyArray<SelectCardListItem>;
  readonly className?: string;
  readonly testId?: string;
}

/** Vertical radio group of [`SelectCard`](./SelectCard.tsx) options. */
/** This is an ugly component */
const SelectCardList = ({
  ariaLabel,
  items,
  className,
  testId,
}: SelectCardListProps) => (
  <div
    className={cn("select-card-list", className)}
    role="radiogroup"
    aria-label={ariaLabel}
    {...(testId !== undefined ? { "data-testid": testId } : {})}
  >
    {items.map((item) => (
      <SelectCard
        key={item.id}
        selected={item.selected}
        testId={item.testId}
        title={item.title}
        subtitle={item.subtitle}
        tertiary={item.tertiary}
        onSelect={item.onSelect}
      />
    ))}
  </div>
);

export default SelectCardList;
