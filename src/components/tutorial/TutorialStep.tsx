// Each step highlights a target region via `targetSelector` (CSS class) and
// renders an instructional card anchored near the highlight ring.

import type { TutorialStepData } from "./tutorialSteps.ts";

interface TutorialStepProps {
  readonly step: TutorialStepData;
  readonly playerName?: string;
  readonly onNext: () => void;
  readonly onSkip: () => void;
  readonly nextDisabled?: boolean;
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
    >
      {/* Step counter */}
      <p className="tutorial-step__counter">
        Step {props.step.stepNumber} of {props.step.totalSteps}
      </p>

      {/* Progress dots */}
      <div
        className="tutorial-step__dots"
        role="progressbar"
        aria-valuenow={props.step.stepNumber}
        aria-valuemax={props.step.totalSteps}
      >
        {Array.from({ length: props.step.totalSteps }, (_, i) => (
          <div
            key={i}
            className={`tutorial-step__dot${
              i < props.step.stepNumber
                ? " tutorial-step__dot--active"
                : " tutorial-step__dot--inactive"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <h2 id="tutorial-step-title" className="tutorial-step__title">
        {displayTitle}
      </h2>
      <p className="tutorial-step__body">
        {props.step.body}
      </p>

      {/* Actions */}
      <div className="tutorial-step__actions">
        <button
          type="button"
          className="btn btn--ghost tutorial-step__skip"
          onClick={props.onSkip}
        >
          Skip tutorial
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={props.onNext}
          disabled={props.nextDisabled}
        >
          {props.step.ctaLabel}
        </button>
      </div>
    </div>
  );
};

export default TutorialStep;
