// Phase 1 shell — shows scan result (success / invalid / error). Logic wired in Phase 5.
import { MdCheck, MdClose, MdError, MdRadioButtonUnchecked } from "react-icons/md";

type ValidationState = "idle" | "success" | "invalid" | "error";

interface ValidationResultProps {
  readonly state: ValidationState;
  readonly missionTitle?: string;
  readonly errorMessage?: string;
}

const STATE_CONFIG: Record<
  ValidationState,
  { label: string; colorVar: string }
> = {
  idle: { label: "Ready to scan", colorVar: "--color-muted-fg" },
  success: { label: "Validated!", colorVar: "--color-status-complete" },
  invalid: { label: "Invalid QR code", colorVar: "--color-destructive" },
  error: { label: "Scan error", colorVar: "--color-destructive" },
};

const getStateIcon = (state: ValidationState) => {
  switch (state) {
    case "success": return MdCheck;
    case "invalid": return MdClose;
    case "error": return MdError;
    case "idle": return MdRadioButtonUnchecked;
  }
};

const ValidationResult = (props: ValidationResultProps) => {
  const cfg = STATE_CONFIG[props.state];
  const StateIcon = getStateIcon(props.state);
  return (
    <div
      className="validation-display"
      data-testid="validation-result"
      data-state={props.state}
      style={{
        textAlign: "center",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-3)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-3xl)",
          color: `hsl(var(${cfg.colorVar}))`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <StateIcon size={48} aria-hidden="true" />
      </span>
      <p
        style={{
          fontWeight: "var(--weight-semibold)",
          color: `hsl(var(${cfg.colorVar}))`,
          margin: 0,
        }}
      >
        {cfg.label}
      </p>
      {props.state === "success" && props.missionTitle && (
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            margin: 0,
          }}
        >
          {props.missionTitle}
        </p>
      )}
      {props.errorMessage && (
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-destructive))",
            margin: 0,
          }}
        >
          {props.errorMessage}
        </p>
      )}
    </div>
  );
};

export default ValidationResult;
