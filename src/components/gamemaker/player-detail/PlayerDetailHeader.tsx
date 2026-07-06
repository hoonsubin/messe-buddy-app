import { MdArrowBack, MdQrCodeScanner } from "react-icons/md";
import { Button } from "../../shared/index.ts";

interface PlayerDetailHeaderProps {
  readonly playerName: string;
  readonly onBack: () => void;
  readonly onScan: () => void;
}

const PlayerDetailHeader = ({
  playerName,
  onBack,
  onScan,
}: PlayerDetailHeaderProps) => (
  <div className="player-detail__header">
    <Button
      type="button"
      variant="ghost"
      className="player-detail__header-btn"
      onClick={onBack}
    >
      <MdArrowBack size={16} />
      <span className="player-detail-header__back-label">All players</span>
    </Button>

    <div className="player-detail__header-title">
      {playerName}'s Onboarding Process
    </div>

    <Button
      type="button"
      variant="ghost"
      className="player-detail__header-btn"
      onClick={onScan}
    >
      <MdQrCodeScanner size={16} />
      <span className="player-detail-header__scan-label">Scan QR</span>
    </Button>
  </div>
);

export default PlayerDetailHeader;
