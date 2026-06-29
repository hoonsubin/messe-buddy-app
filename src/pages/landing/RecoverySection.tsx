import { MdVpnKey } from "react-icons/md";
import { Button, Input } from "../../components/ui/index.ts";
import type { ActiveForm } from "../../hooks/useLandingFlow.ts";

interface RecoverySectionProps {
  readonly recoveryKeyInput: string;
  readonly status: "idle" | "loading" | "error";
  readonly errorMessage: string;
  readonly activeForm: ActiveForm;
  readonly onRecoveryKeyChange: (v: string) => void;
  readonly onRecover: () => void;
}

const RecoverySection = ({
  recoveryKeyInput,
  status,
  errorMessage,
  activeForm,
  onRecoveryKeyChange,
  onRecover,
}: RecoverySectionProps) => (
  <>
    <hr className="landing__rule" />

    <p className="landing__section-label landing__section-label--tight">
      Recover a profile
    </p>

    <div className="landing__form-field--compact landing-recovery-row">
      <div className="landing-recovery-row__field">
        <label htmlFor="lp-recovery-key" className="form-label">
          Recovery key
        </label>
        <Input
          id="lp-recovery-key"
          type="text"
          className="landing__input-mono"
          value={recoveryKeyInput}
          onChange={(e) => onRecoveryKeyChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRecover()}
          placeholder="e.g. HOON0042"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="landing-recovery-row__btn"
        disabled={status === "loading" || !recoveryKeyInput.trim()}
        onClick={onRecover}
      >
        <MdVpnKey size={16} />
        Recover
      </Button>
    </div>

    {status === "error" && activeForm === null && (
      <p className="form-error">{errorMessage}</p>
    )}
  </>
);

export default RecoverySection;
