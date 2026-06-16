import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PLACEHOLDER_STEPS } from "../components/tutorial/TutorialOverlay.tsx";
import type { AppAdapter } from "../adapters/interface.ts";
import type { Player } from "../types/index.ts";

// Profile Setup mission ID from mock data - used for tutorial final-step routing.
const PROFILE_MISSION_ID = "mission_profile";

// The 0-based index of the Profile step within PLACEHOLDER_STEPS.
const PROFILE_STEP_INDEX = 4;

// sessionStorage keys for tutorial state.
const TUTORIAL_FORM_KEY = "mb_tutorial_form_pending";
const TUTORIAL_STEP_KEY = "mb_tutorial_step";

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseTutorialResult {
  readonly tutorialStep: number;
  readonly showTutorial: boolean;
  readonly showSkipConfirm: boolean;
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
 * - Advances steps, navigates to /form on the profile step
 * - Shows/hides the skip-confirm dialog
 * - Persists tutorialComplete on skip
 */
export const useTutorial = (
  player: Player | null,
  adapter: AppAdapter,
): UseTutorialResult => {
  const navigate = useNavigate();
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

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

  const handleTutorialNext = useCallback(() => {
    if (tutorialStep === PROFILE_STEP_INDEX) {
      sessionStorage.setItem(TUTORIAL_FORM_KEY, "1");
      navigate(`/form/${PROFILE_MISSION_ID}`);
      return;
    }

    const nextStep = tutorialStep + 1;
    if (nextStep >= PLACEHOLDER_STEPS.length) return;

    setTutorialStep(nextStep);
    persistStep(nextStep);
  }, [tutorialStep, navigate]);

  const handleTutorialSkip = useCallback(() => {
    setShowSkipConfirm(true);
  }, []);

  const handleSkipConfirm = useCallback(() => {
    if (player?.id) {
      adapter.updatePlayer(player.id, { tutorialComplete: true }).catch(() => {
        // Silent failure
      });
    }
    clearTutorialStorage();
    setShowSkipConfirm(false);
    setShowTutorial(false);
  }, [player, adapter]);

  const handleSkipCancel = useCallback(() => {
    setShowSkipConfirm(false);
  }, []);

  return {
    tutorialStep,
    showTutorial,
    showSkipConfirm,
    handleTutorialNext,
    handleTutorialSkip,
    handleSkipConfirm,
    handleSkipCancel,
  };
};
