import { MdClose } from "react-icons/md";
import { Button, IconButton, Input } from "../shared/index.ts";
import type { JoinView, LandingStatus } from "../../hooks/useLandingFlow.ts";

interface EmployeeFormProps {
  readonly view: JoinView;
  readonly playerName: string;
  readonly status: LandingStatus;
  readonly errorMessage: string;
  readonly onNameChange: (v: string) => void;
  readonly onJoin: () => void;
  readonly onClose: () => void;
}

const EmployeeForm = ({
  view,
  playerName,
  status,
  errorMessage,
  onNameChange,
  onJoin,
  onClose,
}: EmployeeFormProps) => (
  <div
    className="landing-form-panel"
    data-role="player"
    data-testid="join-claim-form"
  >
    <div className="landing-form-panel__header">
      <span className="landing-form-panel__title">
        {view === "claim_name" ? "Your name" : "Join your onboarding"}
      </span>
      <IconButton type="button" aria-label="Close" onClick={onClose}>
        <MdClose size={18} />
      </IconButton>
    </div>

    {view === "loading" && (
      <p className="landing-form-panel__status" data-testid="join-loading">
        Opening your invite…
      </p>
    )}

    {view === "missing_invite" && (
      <>
        <p className="landing-form-panel__hint">
          Open the invitation link from your Game Master, or scan the QR code on
          their invite card. Manual workspace codes are not supported.
        </p>
        {status === "error" && <p className="form-error">{errorMessage}</p>}
      </>
    )}

    {view === "claim_name" && (
      <>
        <p className="landing-form-panel__hint">
          Almost there — tell us what to call you on this device.
        </p>
        <div className="landing__form-field--compact">
          <label htmlFor="lp-player-name" className="form-label">
            Your name
          </label>
          <Input
            id="lp-player-name"
            type="text"
            value={playerName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onJoin()}
            placeholder="e.g. Sofia Chen"
            autoFocus
          />
        </div>
        {status === "error" && <p className="form-error">{errorMessage}</p>}
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="landing__btn-full"
          disabled={status === "loading" || !playerName.trim()}
          onClick={onJoin}
        >
          {status === "loading" ? "Joining…" : "Join & save profile"}
        </Button>
      </>
    )}
  </div>
);

export default EmployeeForm;
