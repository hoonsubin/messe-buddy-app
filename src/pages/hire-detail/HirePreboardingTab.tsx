import type { PreBoardingCheckItem } from "../../types/index.ts";
import PreBoardingChecklist from "../../components/admin/PreBoardingChecklist.tsx";

interface HirePreboardingTabProps {
  readonly hireFirstName: string;
  readonly items: ReadonlyArray<PreBoardingCheckItem>;
  readonly onToggle: (id: string) => void;
  readonly onAdd: (label: string) => void;
  readonly onMarkAllDone: () => void;
}

const HirePreboardingTab = ({
  hireFirstName,
  items,
  onToggle,
  onAdd,
  onMarkAllDone,
}: HirePreboardingTabProps) => (
  <main className="hire-detail__main">
    <PreBoardingChecklist
      playerName={hireFirstName}
      items={items}
      onToggle={onToggle}
      onAdd={onAdd}
      onMarkAllDone={onMarkAllDone}
    />
  </main>
);

export default HirePreboardingTab;
