import { useCallback, useEffect, useState } from "react";
import { PLACEHOLDER_STEPS } from "../components/tutorial/TutorialOverlay.tsx";
import {
  TUTORIAL_FORM_KEY,
  TUTORIAL_STEP_KEY,
} from "../components/tutorial/constants.ts";
import type { Mission, PBRecord, Player } from "../types/index.ts";

/** 0-based index of the profile step within PLACEHOLDER_STEPS. */
export const PROFILE_STEP_INDEX = 4;

export interface UseTutorialOptions {
  readonly onboardingProfileMission: Mission | null;
  readonly onLaunchTutorialMission: (missionId: string) => void;
  readonly missionsReady: boolean;
}

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
    if (nextStep >= PLACEHOLDER_STEPS.length) return;

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
