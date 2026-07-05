import type { BuddyProfileDraft, Player } from "../../types/index.ts";
import BuddyAssignmentForm from "../../components/gamemaker/BuddyAssignmentForm.tsx";

interface PlayerBuddyTabProps {
  readonly players: ReadonlyArray<Player>;
  readonly draft: BuddyProfileDraft;
  readonly selectedPlayerId: string;
  readonly onPlayerChange: (id: string) => void;
  readonly onDraftChange: (draft: BuddyProfileDraft) => void;
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
