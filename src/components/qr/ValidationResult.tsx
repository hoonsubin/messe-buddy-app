// Shows scan result (idle / scanning / success / invalid / error).
import {
  MdBluetoothSearching,
  MdCheck,
  MdClose,
  MdError,
  MdRadioButtonUnchecked,
} from "react-icons/md";

type ValidationState = "idle" | "scanning" | "success" | "invalid" | "error";

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
  scanning: { label: "Scanning...", colorVar: "--color-accent" },
  success: { label: "Validated!", colorVar: "--color-status-complete" },
  invalid: { label: "Invalid QR code", colorVar: "--color-destructive" },
  error: { label: "Scan error", colorVar: "--color-destructive" },
};

const STATE_ICON: Record<ValidationState, typeof MdCheck> = {
  idle: MdRadioButtonUnchecked,
  scanning: MdBluetoothSearching,
  success: MdCheck,
  invalid: MdClose,
  error: MdError,
};

const ValidationResult = (props: ValidationResultProps) => {
  const cfg = STATE_CONFIG[props.state];
  const Icon = STATE_ICON[props.state];
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
        <Icon size={48} aria-hidden="true" />
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
