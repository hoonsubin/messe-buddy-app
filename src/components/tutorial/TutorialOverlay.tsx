// Phase 1 shell — full-screen tutorial overlay. Logic wired in Phase 5.
// Mounts when player.tutorialComplete === false.
// Renders a dim backdrop, a highlight ring around the target element,
// and a TutorialStep card.

import TutorialStep from "./TutorialStep.tsx";
import type { TutorialStepData } from "./TutorialStep.tsx";

// Static placeholder steps — real copy from wireframe wired in Phase 5.
const PLACEHOLDER_STEPS: ReadonlyArray<TutorialStepData> = [
  {
    stepNumber: 1,
    totalSteps: 4,
    title: "Welcome to MesseBuddy",
    body:
      "Here's how your onboarding works. You'll complete missions to earn XP and unlock milestones.",
    ctaLabel: "Let's start",
    targetSelector: undefined,
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    title: "Your Profile",
    body:
      "First, tell us a bit about yourself. Your buddy and team will use this to get to know you.",
    ctaLabel: "Set up profile",
    targetSelector: ".ms-strip",
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    title: "The Journey Map",
    body:
      "Each milestone is a chapter of your onboarding. Complete missions within a milestone to unlock the next.",
    ctaLabel: "Got it",
    targetSelector: ".milestone-map",
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    title: "Your Buddy",
    body:
      "Your buddy is your guide for the first weeks. Reach out any time — they're here to help.",
    ctaLabel: "Done",
    targetSelector: ".buddy-card",
  },
];

interface TutorialOverlayProps {
  readonly isVisible: boolean;
  readonly currentStepIndex: number; // 0-based
  readonly onNext: () => void;
  readonly onSkip: () => void;
}

const TutorialOverlay = (props: TutorialOverlayProps) => {
  if (!props.isVisible) return null;

  const step = PLACEHOLDER_STEPS[props.currentStepIndex] ??
    PLACEHOLDER_STEPS[0]!;

  return (
    <div
      className="tutorial-overlay"
      data-testid="tutorial-overlay"
      data-step-index={props.currentStepIndex}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        /* Semi-transparent backdrop — highlight ring punches through via mix-blend-mode in Phase 5 */
        background: "hsl(var(--color-fg) / 0.55)",
        pointerEvents: "none",
      }}
      aria-hidden="true" /* TutorialStep dialog is the accessible focus target */
    >
      {/* Highlight ring placeholder — Phase 5 positions this over targetSelector */}
      <div
        className="tutorial-overlay__highlight"
        data-target={step.targetSelector}
        style={{
          position: "absolute",
          /* Centered placeholder dimensions; Phase 5 replaces with getBoundingClientRect values */
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "60%",
          height: "8rem",
          borderRadius: "var(--radius-lg)",
          outline: "3px solid hsl(var(--color-primary))",
          outlineOffset: "var(--space-1)",
          background: "transparent",
        }}
      />
    </div>
  );
};

// Composite: overlay backdrop + interactive step card in the same mount point.
// Separated so the step card sits above the pointer-events:none backdrop.
export const TutorialOverlayWithStep = (props: TutorialOverlayProps) => {
  if (!props.isVisible) return null;

  const step = PLACEHOLDER_STEPS[props.currentStepIndex] ??
    PLACEHOLDER_STEPS[0]!;

  return (
    <>
      <TutorialOverlay {...props} />
      <TutorialStep
        step={step}
        onNext={props.onNext}
        onSkip={props.onSkip}
      />
    </>
  );
};

export default TutorialOverlay;
