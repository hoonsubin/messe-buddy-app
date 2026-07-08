// MesseBuddy — Player onboarding tutorial.

// This file intentionally mixes component and non-component exports, which
// trips `react-refresh/only-export-components`. That rule exists so editing
// a file hot-swaps instead of full-reloading during `deno task dev` — a real
// but minor cost, and one we're accepting on purpose here: this feature is
// touched rarely, and the previous 5-file split is what let a step's target
// selector, its copy, and its positioning logic drift out of sync with each
// other undetected. One file, occasionally slower dev reloads, wins that
// trade for this feature specifically.
/* eslint-disable react-refresh/only-export-components */

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Mission, PBRecord, Player } from "../../types/index.ts";

// ── sessionStorage keys ──────────────────────────────────────────────────────

/** sessionStorage keys for the player tutorial flow. */
export const TUTORIAL_FORM_KEY = "mb_tutorial_form_pending";
export const TUTORIAL_STEP_KEY = "mb_tutorial_step";

// ── Target registry ──────────────────────────────────────────────────────────
//
// Every element the tutorial can spotlight is named here once. The step data
// below and the `data-tutorial-target` attribute on the real target element
// (in CurrentMissionsList.tsx, PlayerDashboardView.tsx, ...) both import from
// this object instead of hand-typing a selector string in two places. That's
// what let step 2 and step 4 silently point at selectors that matched nothing
// in the DOM (`[data-testid="milestone-map-viewer"]` was never defined; and
// `.assistant-chat-card` only exists on the separate Assistant tab) — nothing
// caught the mismatch because there was no single source of truth to check it
// against.

export const TUTORIAL_TARGETS = {
  MILESTONE_MAP: "milestone-map",
  PROFILE_MISSION: "profile-mission",
} as const;

/** Builds the `[data-tutorial-target="..."]` selector for a registered target. */
export const tutorialTargetSelector = (
  name: (typeof TUTORIAL_TARGETS)[keyof typeof TUTORIAL_TARGETS],
): string => `[data-tutorial-target="${name}"]`;

// ── Step data ────────────────────────────────────────────────────────────────

export interface TutorialStepData {
  readonly stepNumber: number; // 1-based display index
  readonly totalSteps: number;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly targetSelector?: string; // CSS selector of the element to highlight
}

/** 0-based index of the profile step within STEPS. */
export const PROFILE_STEP_INDEX = 4;

// Flow: Welcome → Map → Buddy → Assistant → Profile (completes tutorial)
export const STEPS: ReadonlyArray<TutorialStepData> = [
  // Step 1 - Welcome (no highlight)
  {
    stepNumber: 1,
    totalSteps: 5,
    title: "Welcome to MesseBuddy",
    body:
      "Welcome to MesseBuddy. Here's what you'll do: complete missions across different office spaces to earn XP, unlock new areas, and get to know your team - all with help from your personal buddy.",
    ctaLabel: "Let's start",
    targetSelector: undefined,
  },
  // Step 2 - The Journey Map
  {
    stepNumber: 2,
    totalSteps: 5,
    title: "The Journey Map",
    body:
      "Each milestone is a chapter of your onboarding. Complete missions within a milestone to earn XP and unlock the next one.",
    ctaLabel: "Got it",
    targetSelector: tutorialTargetSelector(TUTORIAL_TARGETS.MILESTONE_MAP),
  },
  // Step 3 - Your Buddy
  {
    stepNumber: 3,
    totalSteps: 5,
    title: "Your Buddy",
    body:
      "Your buddy is your guide for the first weeks. They'll help you navigate the company, answer questions, and make sure you feel at home. Reach out any time - they're here to help.",
    ctaLabel: "Got it",
    targetSelector: '[data-testid="buddy-card"]',
  },
  // Step 4 - AI policy assistant
  {
    stepNumber: 4,
    totalSteps: 5,
    title: "Ask about policies",
    body:
      "Have a quick question about company policies - vacation, hours, expenses? Open the assistant at the top of the page for instant answers drawn straight from the official documents. For anything personal, your buddy is still your best contact. Hand-picked resources are in the block at the bottom.",
    ctaLabel: "Got it",
    // The nav tab, not the chat panel itself - the chat panel only mounts on
    // the Assistant route, which isn't rendered while this step runs on the
    // Dashboard route.
    targetSelector: '[data-testid="player-cockpit-tab-assistant"]',
  },
  // Step 5 - Complete Your Profile (final step - submitting the form completes the tutorial)
  {
    stepNumber: 5,
    totalSteps: 5,
    title: "Complete Your Profile",
    body:
      "Now let's set up your profile. Open the mission to officially get started with your journey!",
    ctaLabel: "Set up profile",
    targetSelector: tutorialTargetSelector(TUTORIAL_TARGETS.PROFILE_MISSION),
  },
];

// ── useTutorial: state + persistence ─────────────────────────────────────────

const readPersistedStep = (): number => {
  try {
    const raw = sessionStorage.getItem(TUTORIAL_STEP_KEY);
    if (raw === null) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const persistStep = (stepIndex: number): void => {
  sessionStorage.setItem(TUTORIAL_STEP_KEY, String(stepIndex));
};

const clearTutorialStorage = (): void => {
  sessionStorage.removeItem(TUTORIAL_FORM_KEY);
  sessionStorage.removeItem(TUTORIAL_STEP_KEY);
};

export interface UseTutorialOptions {
  readonly onboardingProfileMission: Mission | null;
  readonly onLaunchTutorialMission: (missionId: string) => void;
  readonly missionsReady: boolean;
}

interface UseTutorialResult {
  readonly tutorialStep: number;
  readonly showTutorial: boolean;
  readonly showSkipConfirm: boolean;
  readonly tutorialNextDisabled: boolean;
  readonly handleTutorialNext: () => void;
  readonly handleTutorialSkip: () => void;
  readonly handleSkipConfirm: () => void;
  readonly handleSkipCancel: () => void;
}

/**
 * Manages the tutorial overlay state for PlayerCockpitPage.
 *
 * Responsibilities:
 * - Reads tutorial state from sessionStorage on mount (handles page reloads
 *   and form round-trips)
 * - Advances steps, delegates profile-step launch to cockpit routing
 * - Shows/hides the skip-confirm dialog
 * - Persists tutorialComplete on skip
 */
export const useTutorial = (
  player: Player | null,
  updatePlayer: (
    patch: Partial<Omit<Player, keyof PBRecord>>,
  ) => Promise<Player>,
  _sessionId: string,
  options: UseTutorialOptions,
): UseTutorialResult => {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const tutorialNextDisabled = tutorialStep === PROFILE_STEP_INDEX &&
    (!options.missionsReady || options.onboardingProfileMission === null);

  // Restore tutorial state once per player load.
  // sessionStorage is a synchronous external store that must be read in an
  // effect — reading it during render would make the component impure.
  useEffect(() => {
    if (!player) return;

    // Priority 1: form round-trip
    const formPending = sessionStorage.getItem(TUTORIAL_FORM_KEY);
    if (formPending !== null) {
      sessionStorage.removeItem(TUTORIAL_FORM_KEY);
      if (!player.profileComplete) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage restore
        setShowTutorial(true);
        setTutorialStep(PROFILE_STEP_INDEX);
        persistStep(PROFILE_STEP_INDEX);
      }
      // profileComplete === true → tutorial done, overlay stays hidden
      return;
    }

    // Priority 2: persisted step
    if (!player.tutorialComplete) {
      const persisted = readPersistedStep();
      setShowTutorial(true);
      setTutorialStep(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  const { missionsReady, onboardingProfileMission, onLaunchTutorialMission } =
    options;

  const handleTutorialNext = useCallback(() => {
    if (tutorialStep === PROFILE_STEP_INDEX) {
      if (!missionsReady) return;
      const mission = onboardingProfileMission;
      if (!mission) return;
      onLaunchTutorialMission(mission.id);
      return;
    }

    const nextStep = tutorialStep + 1;
    if (nextStep >= STEPS.length) return;

    setTutorialStep(nextStep);
    persistStep(nextStep);
  }, [
    tutorialStep,
    missionsReady,
    onboardingProfileMission,
    onLaunchTutorialMission,
  ]);

  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    setShowSkipConfirm(true);
  }, []);

  const handleSkipConfirm = useCallback(() => {
    if (player?.id) {
      updatePlayer({ tutorialComplete: true }).catch(() => {
        // Silent failure
      });
    }
    clearTutorialStorage();
    setShowSkipConfirm(false);
    setShowTutorial(false);
  }, [player, updatePlayer]);

  const handleSkipCancel = useCallback(() => {
    setShowSkipConfirm(false);
    if (player && !player.tutorialComplete) {
      setShowTutorial(true);
    }
  }, [player]);

  return {
    tutorialStep,
    showTutorial,
    showSkipConfirm,
    tutorialNextDisabled,
    handleTutorialNext,
    handleTutorialSkip,
    handleSkipConfirm,
    handleSkipCancel,
  };
};

// ── useHighlightRect: tracks the bounding rect of a CSS selector ─────────────

interface HighlightRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

const SCROLL_SETTLE_MS = 350;

/**
 * Resolves `selector` to its live bounding rect, auto-scrolling the element
 * into view whenever the selector changes. Recomputes on resize/scroll so the
 * ring tracks the target through layout shifts.
 *
 * Logs a dev-only warning when a selector matches nothing, so a step
 * targeting a nonexistent or not-yet-mounted element fails loudly instead of
 * silently falling back to "no highlight."
 */
const useHighlightRect = (
  selector: string | undefined,
): HighlightRect | null => {
  const [rect, setRect] = useState<HighlightRect | null>(null);

  // Guard against recalculating for the same selector across StrictMode
  // double-fire.
  const lastSelectorRef = useRef<string | undefined>(undefined);

  const recalc = useCallback(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      if (import.meta.env.DEV) {
        console.warn(
          `[tutorial] targetSelector "${selector}" matched no element in the DOM.`,
        );
      }
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [selector]);

  useEffect(() => {
    if (selector === lastSelectorRef.current) return;
    lastSelectorRef.current = selector;

    const raf = requestAnimationFrame(() => {
      recalc();

      if (selector) {
        const el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Recalc after scroll settles, since scrollIntoView is async.
          setTimeout(recalc, SCROLL_SETTLE_MS);
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [recalc, selector]);

  useEffect(() => {
    let scrollRaf = 0;
    const onScroll = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(recalc);
    };
    globalThis.addEventListener("resize", recalc);
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      globalThis.removeEventListener("resize", recalc);
      globalThis.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollRaf);
    };
  }, [recalc]);

  return rect;
};

// ── Step card anchoring ───────────────────────────────────────────────────────

const CARD_MARGIN = 16;
const CARD_HALF_WIDTH = 192; // half of `min(90%, 24rem)` at typical widths

/**
 * Positions the step card just below the highlight rect (or above it, if
 * there's more room above), clamped to stay on-screen. Returns `{}` when
 * there is no highlight, so the card falls back to the `.tutorial-step` CSS
 * default (fixed, bottom-center) used for the plain welcome step.
 *
 * Caps the card's height at whatever space is actually available on the
 * chosen side (with internal scrolling as a fallback) rather than assuming a
 * fixed card height - a target that leaves little room, or a step with a
 * longer body, would otherwise push the card partly off-screen and out of
 * reach, buttons included.
 */
const anchoredCardStyle = (rect: HighlightRect | null): CSSProperties => {
  if (!rect) return {};

  const viewportH = globalThis.innerHeight;
  const viewportW = globalThis.innerWidth;
  const spaceBelow = viewportH - (rect.top + rect.height) - CARD_MARGIN * 2;
  const spaceAbove = rect.top - CARD_MARGIN * 2;
  const placeBelow = spaceBelow >= spaceAbove;
  const available = Math.max(placeBelow ? spaceBelow : spaceAbove, 160);

  const centerX = rect.left + rect.width / 2;
  const left = Math.min(
    Math.max(centerX, CARD_HALF_WIDTH + CARD_MARGIN),
    viewportW - CARD_HALF_WIDTH - CARD_MARGIN,
  );

  return placeBelow
    ? {
      top: rect.top + rect.height + CARD_MARGIN,
      bottom: "auto",
      left,
      transform: "translateX(-50%)",
      maxHeight: available,
      overflowY: "auto",
    }
    : {
      top: "auto",
      bottom: viewportH - rect.top + CARD_MARGIN,
      left,
      transform: "translateX(-50%)",
      maxHeight: available,
      overflowY: "auto",
    };
};

// ── UI ────────────────────────────────────────────────────────────────────────

interface TutorialOverlayProps {
  readonly isVisible: boolean;
  readonly currentStepIndex: number; // 0-based
  readonly steps: ReadonlyArray<TutorialStepData>;
  readonly playerName?: string;
  readonly onNext: () => void;
  readonly onSkip: () => void;
  readonly nextDisabled?: boolean;
}

const WELCOME_STEP_NUMBER = 1;

const firstName = (name: string): string => name.split(" ")[0] ?? name;

const welcomeTitle = (playerName?: string): string => {
  const first = playerName ? firstName(playerName) : "";
  return first ? `Hello, ${first}.` : "Hello.";
};

/**
 * Renders the dim backdrop, a highlight ring around the current step's
 * target (when it has one), and the instructional step card anchored next
 * to that ring.
 */
export const Tutorial = (props: TutorialOverlayProps) => {
  const step = props.steps[props.currentStepIndex] ?? props.steps[0];
  const highlightRect = useHighlightRect(step?.targetSelector);

  if (!props.isVisible || !step) return null;

  const isWelcome = step.stepNumber === WELCOME_STEP_NUMBER;
  const displayTitle = isWelcome && props.playerName
    ? welcomeTitle(props.playerName)
    : step.title;

  return (
    <>
      <div
        className="tutorial-overlay"
        data-testid="tutorial-overlay"
        data-step-index={props.currentStepIndex}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "transparent", // override .tutorial-overlay CSS which sets background-color: hsl(--color-bg)
          pointerEvents: "none",
        }}
        aria-hidden="true" /* the step card below is the accessible focus target */
      >
        {
          /* Dim backdrop - only when there is no targeted highlight ring.
            When a highlight ring is active, the ring's box-shadow provides
            the dimming outside the spotlight; a separate backdrop would
            double-stack the opacity and bleed into the spotlight center. */
        }
        {highlightRect === null && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "hsl(var(--color-fg) / 0.55)",
            }}
          />
        )}

        {/* Highlight ring - spotlight effect via box-shadow */}
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

      <div
        className="tutorial-step"
        data-testid="tutorial-step"
        data-step={step.stepNumber}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-step-title"
        style={anchoredCardStyle(highlightRect)}
      >
        {/* Step counter */}
        <p className="tutorial-step__counter">
          Step {step.stepNumber} of {step.totalSteps}
        </p>

        {/* Progress dots */}
        <div
          className="tutorial-step__dots"
          role="progressbar"
          aria-valuenow={step.stepNumber}
          aria-valuemax={step.totalSteps}
        >
          {Array.from({ length: step.totalSteps }, (_, i) => (
            <div
              key={i}
              className={`tutorial-step__dot${
                i < step.stepNumber
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
          {step.body}
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
            {step.ctaLabel}
          </button>
        </div>
      </div>
    </>
  );
};

export default Tutorial;
