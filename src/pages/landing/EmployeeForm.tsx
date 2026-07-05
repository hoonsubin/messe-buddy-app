import { MdCheck, MdClose } from "react-icons/md";
import { Button, IconButton, Input } from "../../components/ui/index.ts";

interface EmployeeFormProps {
  readonly step: "code" | "name";
  readonly sessionCode: string;
  readonly inviteToken: string;
  readonly playerName: string;
  readonly verifiedSessionId: string;
  readonly status: "idle" | "loading" | "error";
  readonly errorMessage: string;
  readonly onSessionChange: (v: string) => void;
  readonly onTokenChange: (v: string) => void;
  readonly onNameChange: (v: string) => void;
  readonly onVerify: () => void;
  readonly onJoin: () => void;
  readonly onClose: () => void;
}

const EmployeeForm = ({
  step,
  sessionCode,
  inviteToken,
  playerName,
  verifiedSessionId,
  status,
  errorMessage,
  onSessionChange,
  onTokenChange,
  onNameChange,
  onVerify,
  onJoin,
  onClose,
}: EmployeeFormProps) => (
  <div className="landing-form-panel" data-role="player">
    <div className="landing-form-panel__header">
      <span className="landing-form-panel__title">
        {step === "code"
          ? "Step 1 of 2 — invite link"
          : "Step 2 of 2 — your name"}
      </span>
      <IconButton type="button" aria-label="Close" onClick={onClose}>
        <MdClose size={18} />
      </IconButton>
    </div>

    {step === "code"
      ? (
        <>
          <div className="landing__form-field--compact">
            <label htmlFor="lp-session-code" className="form-label">
              Workspace ID
            </label>
            <Input
              id="lp-session-code"
              type="text"
              value={sessionCode}
              onChange={(e) => onSessionChange(e.target.value)}
              placeholder="From your invite link"
            />
          </div>
          <div className="landing__form-field--compact">
            <label htmlFor="lp-invite-token" className="form-label">
              Invite token
            </label>
            <Input
              id="lp-invite-token"
              type="text"
              value={inviteToken}
              onChange={(e) => onTokenChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onVerify()}
              placeholder="Token from your invite link"
              autoFocus={!sessionCode}
            />
          </div>
          {status === "error" && <p className="form-error">{errorMessage}</p>}
          <Button
            type="button"
            variant="primary"
            fullWidth
            className="landing__btn-full"
            disabled={status === "loading" ||
              !sessionCode.trim() ||
              !inviteToken.trim()}
            onClick={onVerify}
          >
            {status === "loading" ? "Verifying…" : "Verify invite"}
          </Button>
        </>
      )
      : (
        <>
          <p className="landing-form-panel__verified">
            <MdCheck size={14} />
            Invite verified · {verifiedSessionId}
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
