// Phase 1 shell — full-screen tutorial overlay. Logic wired in Phase 5.
// Mounts when player.tutorialComplete === false.
// Renders a dim backdrop, a dynamic highlight ring around the target element,
// and a TutorialStep card.

import { useCallback, useEffect, useState } from "react";
import TutorialStep from "./TutorialStep.tsx";
import type { TutorialStepData } from "./tutorialSteps.ts";

export { PLACEHOLDER_STEPS } from "./tutorialSteps.ts";

interface HighlightRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

interface TutorialOverlayProps {
  readonly isVisible: boolean;
  readonly currentStepIndex: number; // 0-based
  readonly steps: ReadonlyArray<TutorialStepData>;
  readonly onNext: () => void;
  readonly onSkip: () => void;
}

const TutorialOverlay = (props: TutorialOverlayProps) => {
  const step = props.steps[props.currentStepIndex] ??
    props.steps[0]!;

  // Dynamic highlight ring positioning — hooks must run unconditionally.
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(
    null,
  );

  const recalcHighlight = useCallback(() => {
    const selector = step.targetSelector;
    if (!selector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setHighlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setHighlightRect(null);
      return;
    }
    setHighlightRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [step.targetSelector]);

  // Recompute on step change — defer via rAF to avoid sync setState in effect.
  useEffect(() => {
    const raf = requestAnimationFrame(recalcHighlight);
    return () => cancelAnimationFrame(raf);
  }, [recalcHighlight]);

  // Recompute on resize and scroll
  useEffect(() => {
    let scrollRaf = 0;
    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(recalcHighlight);
    };
    globalThis.addEventListener("resize", recalcHighlight);
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      globalThis.removeEventListener("resize", recalcHighlight);
      globalThis.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollRaf);
    };
  }, [recalcHighlight]);

  if (!props.isVisible) return null;

  return (
    <div
      className="tutorial-overlay"
      data-testid="tutorial-overlay"
      data-step-index={props.currentStepIndex}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        pointerEvents: "none",
      }}
      aria-hidden="true" /* TutorialStep dialog is the accessible focus target */
    >
      {/* Dim backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "hsl(var(--color-fg) / 0.55)",
        }}
      />

      {/* Highlight ring — spotlight effect via box-shadow */}
      {highlightRect !== null && (
        <div
          className="tutorial-overlay__highlight"
          data-target={step.targetSelector}
          style={{
            position: "absolute",
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            borderRadius: "var(--radius-lg)",
            boxShadow:
              "0 0 0 9999px hsl(var(--color-fg) / 0.55), inset 0 0 0 2px hsl(var(--color-primary))",
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}
    </div>
  );
};

// Composite: overlay backdrop + interactive step card in the same mount point.
// Separated so the step card sits above the pointer-events:none backdrop.
export const TutorialOverlayWithStep = (props: TutorialOverlayProps) => {
  if (!props.isVisible) return null;

  const step = props.steps[props.currentStepIndex] ??
    props.steps[0]!;

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
