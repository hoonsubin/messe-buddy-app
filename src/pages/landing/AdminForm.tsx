import { MdClose } from "react-icons/md";
import { Button, IconButton, Input } from "../../components/ui/index.ts";

interface AdminFormProps {
  readonly sessionName: string;
  readonly adminName: string;
  readonly status: "idle" | "loading" | "error";
  readonly errorMessage: string;
  readonly onSessionNameChange: (v: string) => void;
  readonly onAdminNameChange: (v: string) => void;
  readonly onCreate: () => void;
  readonly onClose: () => void;
}

const AdminForm = ({
  sessionName,
  adminName,
  status,
  errorMessage,
  onSessionNameChange,
  onAdminNameChange,
  onCreate,
  onClose,
}: AdminFormProps) => (
  <div className="landing-form-panel" data-role="admin">
    <div className="landing-form-panel__header">
      <span className="landing-form-panel__title">Create admin session</span>
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
      <label htmlFor="lp-admin-name" className="form-label">
        Your name
      </label>
      <Input
        id="lp-admin-name"
        type="text"
        value={adminName}
        onChange={(e) => onAdminNameChange(e.target.value)}
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
      disabled={status === "loading" || !sessionName.trim() || !adminName.trim()}
      onClick={onCreate}
    >
      {status === "loading" ? "Creating…" : "Create & save profile"}
    </Button>
  </div>
);

export default AdminForm;
