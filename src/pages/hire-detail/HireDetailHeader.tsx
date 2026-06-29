import { MdArrowBack, MdQrCodeScanner } from "react-icons/md";
import { Button } from "../../components/ui/index.ts";

interface HireDetailHeaderProps {
  readonly hireName: string;
  readonly onBack: () => void;
  readonly onScan: () => void;
}

const HireDetailHeader = ({
  hireName,
  onBack,
  onScan,
}: HireDetailHeaderProps) => (
  <div className="hire-detail__header">
    <Button
      type="button"
      variant="ghost"
      className="hire-detail__header-btn"
      onClick={onBack}
    >
      <MdArrowBack size={16} />
      <span className="hire-header__back-label">All new hires</span>
    </Button>

    <div className="hire-detail__header-title">
      {hireName}'s Onboarding Process
    </div>

    <Button
      type="button"
      variant="ghost"
      className="hire-detail__header-btn"
      onClick={onScan}
    >
      <MdQrCodeScanner size={16} />
      <span className="hire-header__scan-label">Scan QR</span>
    </Button>
  </div>
);

export default HireDetailHeader;
