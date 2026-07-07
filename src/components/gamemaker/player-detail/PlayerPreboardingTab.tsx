import type { PreBoardingCheckItem } from "../../../types/index.ts";
import PreBoardingChecklist from "../PreBoardingChecklist.tsx";

interface PlayerPreboardingTabProps {
  readonly playerFirstName: string;
  readonly items: ReadonlyArray<PreBoardingCheckItem>;
  readonly onToggle: (id: string) => void;
  readonly onAdd: (label: string) => void;
  readonly onMarkAllDone: () => void;
}

const PlayerPreboardingTab = ({
  playerFirstName,
  items,
  onToggle,
  onAdd,
  onMarkAllDone,
}: PlayerPreboardingTabProps) => (
  <main className="player-detail__main">
    <PreBoardingChecklist
      playerName={playerFirstName}
      items={items}
      onToggle={onToggle}
      onAdd={onAdd}
      onMarkAllDone={onMarkAllDone}
    />
  </main>
);

export default PlayerPreboardingTab;
