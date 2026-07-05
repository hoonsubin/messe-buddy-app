import type { BuddyProfile, Player } from "../../types/index.ts";
import BuddyAssignmentForm from "../../components/gamemaker/BuddyAssignmentForm.tsx";

interface PlayerBuddyTabProps {
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

const PlayerBuddyTab = ({
  players,
  draft,
  selectedPlayerId,
  onPlayerChange,
  onDraftChange,
  onSave,
}: PlayerBuddyTabProps) => (
  <main className="player-detail__main">
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

export default PlayerBuddyTab;
