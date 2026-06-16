// Phase 1 shell - tutorial step overlay card. Logic wired in Phase 5.
// Each step highlights a target region via `targetSelector` (CSS class) and
// renders an instructional card anchored near the highlight ring.

import type { TutorialStepData } from "./tutorialSteps.ts";

interface TutorialStepProps {
  readonly step: TutorialStepData;
  readonly playerName?: string;
  readonly onNext: () => void;
  readonly onSkip: () => void;
}

/** Returns the first name from a full name string, or falls back to the full string. */
const firstName = (name: string): string => name.split(" ")[0] ?? name;

/** Returns a personalized title for the Welcome step (stepNumber === 1). */
const welcomeTitle = (playerName?: string): string => {
  const first = playerName ? firstName(playerName) : "";
  return first ? `Hello, ${first}.` : "Hello.";
};

// Step 0 (index 0) = Welcome step - shown when stepNumber === 1.
const WELCOME_STEP_NUMBER = 1;

const TutorialStep = (props: TutorialStepProps) => {
  const isWelcome = props.step.stepNumber === WELCOME_STEP_NUMBER;
  const displayTitle = isWelcome && props.playerName
    ? welcomeTitle(props.playerName)
    : props.step.title;

  return (
    <div
      className="tutorial-step"
      data-testid="tutorial-step"
      data-step={props.step.stepNumber}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-step-title"
      style={{
        position: "fixed",
        bottom: "clamp(var(--space-4), 5svh, var(--space-10))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(90%, 24rem)",
        background: "hsl(var(--color-card))",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        padding: "var(--space-5)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {/* Step counter */}
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "hsl(var(--color-muted-fg))",
          margin: 0,
          fontWeight: "var(--weight-medium)",
        }}
      >
        Step {props.step.stepNumber} of {props.step.totalSteps}
      </p>

      {/* Progress dots */}
      <div
        style={{ display: "flex", gap: "var(--space-1)" }}
        role="progressbar"
        aria-valuenow={props.step.stepNumber}
        aria-valuemax={props.step.totalSteps}
      >
        {Array.from({ length: props.step.totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              width: "var(--space-2)",
              height: "var(--space-2)",
              borderRadius: "var(--radius-full)",
              background: i < props.step.stepNumber
                ? "hsl(var(--color-primary))"
                : "hsl(var(--color-border))",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <h2
        id="tutorial-step-title"
        style={{
          margin: 0,
          fontSize: "var(--text-lg)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        {displayTitle}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        {props.step.body}
      </p>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "var(--space-2)",
        }}
      >
        <button
          type="button"
          className="btn btn--ghost"
          style={{
            fontSize: "var(--text-xs)",
            color: "hsl(var(--color-muted-fg))",
          }}
          onClick={props.onSkip}
        >
          Skip tutorial
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={props.onNext}
        >
          {props.step.ctaLabel}
        </button>
      </div>
    </div>
  );
};

export default TutorialStep;
