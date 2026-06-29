import { MdArrowBack } from "react-icons/md";
import { Button } from "../../components/ui/index.ts";

interface PlayerCockpitToolbarProps {
  readonly isDemo: boolean;
  readonly onLeave: () => void;
}

const PlayerCockpitToolbar = (
  { isDemo, onLeave }: PlayerCockpitToolbarProps,
) => (
  <div className="player-cockpit__toolbar">
    <Button
      type="button"
      variant="ghost"
      className="player-cockpit__toolbar-btn"
      onClick={onLeave}
    >
      <MdArrowBack size={16} />
      {isDemo ? "Back to Landing" : "Log Out"}
    </Button>
  </div>
);

export default PlayerCockpitToolbar;
