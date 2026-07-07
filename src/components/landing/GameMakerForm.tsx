import { MdClose } from "react-icons/md";
import { Button, IconButton, Input } from "../shared/index.ts";

interface GameMakerFormProps {
  readonly sessionName: string;
  readonly gmName: string;
  readonly status: "idle" | "loading" | "error";
  readonly errorMessage: string;
  readonly onSessionNameChange: (v: string) => void;
  readonly onGmNameChange: (v: string) => void;
  readonly onCreate: () => void;
  readonly onClose: () => void;
}

const GameMakerForm = ({
  sessionName,
  gmName,
  status,
  errorMessage,
  onSessionNameChange,
  onGmNameChange,
  onCreate,
  onClose,
}: GameMakerFormProps) => (
  <div
    className="landing-form-panel"
    data-role="gamemaker"
    data-testid="landing-workspace-form"
  >
    <div className="landing-form-panel__header">
      <span className="landing-form-panel__title">Create workspace</span>
      <IconButton type="button" aria-label="Close" onClick={onClose}>
        <MdClose size={18} />
      </IconButton>
    </div>

    <div className="landing__form-field--compact">
      <label htmlFor="lp-session-name" className="form-label">
        Session name
      </label>
      <Input
        id="lp-session-name"
        type="text"
        value={sessionName}
        onChange={(e) => onSessionNameChange(e.target.value)}
        placeholder="e.g. MMT Onboarding June 2026"
        autoFocus
      />
    </div>

    <div className="landing__form-field--compact">
      <label htmlFor="lp-gm-name" className="form-label">
        Your name
      </label>
      <Input
        id="lp-gm-name"
        type="text"
        value={gmName}
        onChange={(e) => onGmNameChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onCreate()}
        placeholder="e.g. Peter Tubak"
      />
    </div>

    {status === "error" && <p className="form-error">{errorMessage}</p>}
    <Button
      type="button"
      variant="primary"
      fullWidth
      className="landing__btn-full"
      disabled={status === "loading" || !sessionName.trim() ||
        !gmName.trim()}
      onClick={onCreate}
    >
      {status === "loading" ? "Creating…" : "Create & save profile"}
    </Button>
  </div>
);

export default GameMakerForm;
