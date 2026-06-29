import type { BuddyProfile, Player } from "../../types/index.ts";
import BuddyAssignmentForm from "../../components/admin/BuddyAssignmentForm.tsx";

interface HireBuddyTabProps {
  readonly players: ReadonlyArray<Player>;
  readonly draft: Omit<
    BuddyProfile,
    "id" | "created" | "updated" | "assignedToPlayerId"
  >;
  readonly selectedPlayerId: string;
  readonly onPlayerChange: (id: string) => void;
  readonly onDraftChange: (
    draft: Omit<
      BuddyProfile,
      "id" | "created" | "updated" | "assignedToPlayerId"
    >,
  ) => void;
  readonly onSave: () => void;
}

const HireBuddyTab = ({
  players,
  draft,
  selectedPlayerId,
  onPlayerChange,
  onDraftChange,
  onSave,
}: HireBuddyTabProps) => (
  <main className="hire-detail__main">
    <BuddyAssignmentForm
      players={players}
      draft={draft}
      selectedPlayerId={selectedPlayerId}
      onPlayerChange={onPlayerChange}
      onDraftChange={onDraftChange}
      onSave={onSave}
      showPlayerSelect={false}
    />
  </main>
);

export default HireBuddyTab;
